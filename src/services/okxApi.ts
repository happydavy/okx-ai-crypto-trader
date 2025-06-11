import axios from 'axios';
import CryptoJS from 'crypto-js';

export interface OKXCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  sandbox?: boolean;
}

export interface MarketData {
  instId: string;
  last: string;
  lastSz: string;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  ts: string;
  sodUtc0: string;
  sodUtc8: string;
}

export interface TradeOrder {
  instId: string;
  tdMode: 'cash' | 'cross' | 'isolated';
  side: 'buy' | 'sell';
  ordType: 'market' | 'limit' | 'post_only' | 'fok' | 'ioc' | 'optimal_limit_ioc';
  sz: string;
  px?: string;
  ccy?: string;
  clOrdId?: string;
  tag?: string;
  posSide?: 'long' | 'short' | 'net';
  reduceOnly?: boolean;
}

export interface AccountBalance {
  adjEq: string;
  details: Array<{
    availBal: string;
    bal: string;
    ccy: string;
    cashBal: string;
    frozenBal: string;
    interest: string;
    uTime: string;
  }>;
  imr: string;
  isoEq: string;
  mgnRatio: string;
  mmr: string;
  notionalUsd: string;
  ordFroz: string;
  totalEq: string;
  uTime: string;
}

class OKXApiService {
  private baseURL: string;
  private credentials: OKXCredentials | null = null;

  constructor() {
    this.baseURL = 'https://us.okx.com';
  }

  setCredentials(credentials: OKXCredentials) {
    this.credentials = credentials;
    if (credentials.sandbox) {
      this.baseURL = 'https://us.okx.com'; // OKX doesn't have separate sandbox URL
    }
  }

  private validateCredentialsFormat(credentials: OKXCredentials): { isValid: boolean; error?: string } {
    // Trim whitespace from all credentials
    const apiKey = credentials.apiKey.trim();
    const secretKey = credentials.secretKey.trim();
    const passphrase = credentials.passphrase.trim();

    // Check if any field is empty
    if (!apiKey || !secretKey || !passphrase) {
      return { isValid: false, error: '请确保所有字段都已填写完整' };
    }

    // OKX API key format validation (typically UUID format)
    const apiKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!apiKeyPattern.test(apiKey)) {
      return { isValid: false, error: 'API Key格式不正确，应为UUID格式（例如：12345678-1234-1234-1234-123456789abc）' };
    }

    // Secret key should be base64 encoded string (typically 44 characters)
    if (secretKey.length < 20) {
      return { isValid: false, error: 'Secret Key长度不正确，请检查是否完整复制' };
    }

    // Passphrase validation (1-30 characters)
    if (passphrase.length < 1 || passphrase.length > 30) {
      return { isValid: false, error: 'Passphrase长度应在1-30个字符之间' };
    }

    return { isValid: true };
  }

  private generateSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    if (!this.credentials) throw new Error('API credentials not set');
    
    const message = timestamp + method.toUpperCase() + requestPath + body;
    console.log('Signature message:', message);
    
    const signature = CryptoJS.enc.Base64.stringify(
      CryptoJS.HmacSHA256(message, this.credentials.secretKey)
    );
    
    console.log('Generated signature:', signature);
    return signature;
  }

  private getHeaders(method: string, requestPath: string, body: string = ''): Record<string, string> {
    if (!this.credentials) throw new Error('API credentials not set');

    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(timestamp, method, requestPath, body);

    const headers = {
      'OK-ACCESS-KEY': this.credentials.apiKey.trim(),
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.credentials.passphrase.trim(),
      'Content-Type': 'application/json',
    };

    console.log('Request headers (API Key):', this.credentials.apiKey.trim());
    console.log('Request headers (Passphrase):', this.credentials.passphrase.trim());
    return headers;
  }

  async verifyCredentials(): Promise<{ isValid: boolean; error?: string }> {
    if (!this.credentials) {
      return { isValid: false, error: 'API credentials not set' };
    }

    // First validate the format
    const formatValidation = this.validateCredentialsFormat(this.credentials);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    console.log('Verifying credentials for API key:', this.credentials.apiKey.trim());

    try {
      const requestPath = '/api/v5/account/balance';
      const headers = this.getHeaders('GET', requestPath);
      
      console.log('Making verification request to:', `${this.baseURL}${requestPath}`);
      console.log('Request headers:', { ...headers, 'OK-ACCESS-SIGN': '[HIDDEN]' });
      
      const response = await axios.get(`${this.baseURL}${requestPath}`, { 
        headers,
        timeout: 15000 // Increased timeout
      });
      
      console.log('Verification response:', response.data);
      
      if (response.data.code === '0') {
        return { isValid: true };
      } else {
        return { 
          isValid: false, 
          error: `API错误: ${response.data.msg || 'API密钥验证失败'} (错误代码: ${response.data.code})`
        };
      }
    } catch (error: any) {
      console.error('API verification error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      if (error.response) {
        const errorData = error.response.data;
        console.log('Error response data:', errorData);
        
        if (error.response.status === 401) {
          return { 
            isValid: false, 
            error: `认证失败: ${errorData?.msg || 'API密钥不存在或无效，请检查API密钥是否正确复制'}` 
          };
        } else if (error.response.status === 403) {
          return { 
            isValid: false, 
            error: 'API密钥缺少必要权限，请确保已开启读取权限' 
          };
        } else {
          return { 
            isValid: false, 
            error: `API错误: ${errorData?.msg || '验证失败'} (状态码: ${error.response.status})`
          };
        }
      } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        return { isValid: false, error: '网络连接失败，请检查网络设置' };
      } else if (error.code === 'ERR_NETWORK') {
        return { 
          isValid: false, 
          error: '网络错误：可能是CORS限制。OKX API通常不支持直接从浏览器访问，建议使用服务器端代理或测试工具。'
        };
      } else {
        return { 
          isValid: false, 
          error: `验证过程中发生错误: ${error.message}`
        };
      }
    }
  }

  async getMarketData(instId: string = 'BTC-USDT'): Promise<MarketData> {
    try {
      console.log('Fetching market data for:', instId);
      const response = await axios.get(`${this.baseURL}/api/v5/market/ticker`, {
        params: { instId },
        timeout: 10000
      });
      
      console.log('Market data response:', response.data);
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        return response.data.data[0];
      }
      throw new Error('Failed to fetch market data');
    } catch (error: any) {
      console.error('Error fetching market data:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('网络错误：无法连接到OKX服务器，请检查网络连接');
      }
      throw error;
    }
  }

  async getAccountBalance(): Promise<AccountBalance> {
    if (!this.credentials) throw new Error('API credentials not set');

    try {
      const requestPath = '/api/v5/account/balance';
      const headers = this.getHeaders('GET', requestPath);
      
      console.log('Fetching account balance from:', `${this.baseURL}${requestPath}`);
      
      const response = await axios.get(`${this.baseURL}${requestPath}`, { 
        headers,
        timeout: 15000
      });
      
      console.log('Account balance response:', response.data);
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        return response.data.data[0];
      }
      throw new Error('Failed to fetch account balance');
    } catch (error: any) {
      console.error('Error fetching account balance:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('网络错误：无法连接到OKX服务器。OKX API可能不支持直接从浏览器访问（CORS限制）');
      }
      throw error;
    }
  }

  // 根据OKX文档更新的下单方法
  async placeOrder(order: TradeOrder): Promise<any> {
    if (!this.credentials) throw new Error('API credentials not set');

    try {
      // 验证交易模式和产品类型的兼容性
      this.validateOrderParams(order);

      const requestPath = '/api/v5/trade/order';
      const orderData = {
        instId: order.instId,
        tdMode: order.tdMode,
        side: order.side,
        ordType: order.ordType,
        sz: order.sz,
        ...(order.px && { px: order.px }),
        ...(order.ccy && { ccy: order.ccy }),
        ...(order.clOrdId && { clOrdId: order.clOrdId }),
        ...(order.tag && { tag: order.tag }),
        ...(order.posSide && { posSide: order.posSide }),
        ...(order.reduceOnly !== undefined && { reduceOnly: order.reduceOnly })
      };

      const body = JSON.stringify(orderData);
      const headers = this.getHeaders('POST', requestPath, body);
      
      console.log('Placing order:', orderData);
      
      const response = await axios.post(`${this.baseURL}${requestPath}`, orderData, { headers });
      
      console.log('Order response:', response.data);
      
      if (response.data.code === '0') {
        return response.data.data[0];
      }
      throw new Error(response.data.msg || 'Failed to place order');
    } catch (error: any) {
      console.error('Error placing order:', error);
      if (error.response) {
        throw new Error(`订单失败: ${error.response.data.msg || error.message}`);
      }
      throw error;
    }
  }

  // 验证订单参数的兼容性
  private validateOrderParams(order: TradeOrder): void {
    // 对于现货交易，tdMode必须是'cash'
    if (order.instId.includes('-USDT') || order.instId.includes('-USD')) {
      if (order.instId.split('-').length === 2) { // 现货对，如BTC-USDT
        if (order.tdMode !== 'cash') {
          throw new Error('现货交易必须使用cash交易模式');
        }
      }
    }

    // 对于限价单，必须提供价格
    if (['limit', 'post_only'].includes(order.ordType) && !order.px) {
      throw new Error('限价单和只做maker单必须提供价格');
    }

    // 对于市价单，不应该提供价格
    if (order.ordType === 'market' && order.px) {
      throw new Error('市价单不应该提供价格');
    }
  }

  // 获取交易账户信息
  async getTradingAccount(): Promise<any> {
    if (!this.credentials) throw new Error('API credentials not set');

    try {
      const requestPath = '/api/v5/account/config';
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await axios.get(`${this.baseURL}${requestPath}`, { headers });
      
      if (response.data.code === '0') {
        return response.data.data[0];
      }
      throw new Error('Failed to fetch trading account info');
    } catch (error) {
      console.error('Error fetching trading account:', error);
      throw error;
    }
  }

  async getOrderHistory(instId?: string): Promise<any[]> {
    if (!this.credentials) throw new Error('API credentials not set');

    try {
      const requestPath = '/api/v5/trade/orders-history-archive';
      const headers = this.getHeaders('GET', requestPath);
      
      const params = instId ? { instId } : {};
      const response = await axios.get(`${this.baseURL}${requestPath}`, { 
        headers,
        params 
      });
      
      if (response.data.code === '0') {
        return response.data.data || [];
      }
      throw new Error('Failed to fetch order history');
    } catch (error) {
      console.error('Error fetching order history:', error);
      throw error;
    }
  }
}

export const okxApi = new OKXApiService();

}
