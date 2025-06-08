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
  ordType: 'market' | 'limit' | 'post_only' | 'fok' | 'ioc';
  sz: string;
  px?: string;
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
    this.baseURL = 'https://www.okx.com';
  }

  setCredentials(credentials: OKXCredentials) {
    this.credentials = credentials;
    if (credentials.sandbox) {
      this.baseURL = 'https://www.okx.com'; // OKX doesn't have separate sandbox URL
    }
  }

  private generateSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    if (!this.credentials) throw new Error('API credentials not set');
    
    const message = timestamp + method + requestPath + body;
    return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(message, this.credentials.secretKey));
  }

  private getHeaders(method: string, requestPath: string, body: string = ''): Record<string, string> {
    if (!this.credentials) throw new Error('API credentials not set');

    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(timestamp, method, requestPath, body);

    return {
      'OK-ACCESS-KEY': this.credentials.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.credentials.passphrase,
      'Content-Type': 'application/json',
    };
  }

  async verifyCredentials(): Promise<{ isValid: boolean; error?: string }> {
    if (!this.credentials) {
      return { isValid: false, error: 'API credentials not set' };
    }

    try {
      const requestPath = '/api/v5/account/balance';
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await axios.get(`${this.baseURL}${requestPath}`, { 
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      if (response.data.code === '0') {
        return { isValid: true };
      } else {
        return { 
          isValid: false, 
          error: response.data.msg || 'Invalid API credentials'
        };
      }
    } catch (error: any) {
      console.error('API verification error:', error);
      
      if (error.response?.status === 401) {
        return { isValid: false, error: 'Invalid API credentials' };
      } else if (error.response?.status === 403) {
        return { isValid: false, error: 'API key lacks required permissions' };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        return { isValid: false, error: 'Network connection failed' };
      } else {
        return { 
          isValid: false, 
          error: error.response?.data?.msg || 'API verification failed'
        };
      }
    }
  }

  async getMarketData(instId: string = 'BTC-USDT'): Promise<MarketData> {
    try {
      const response = await axios.get(`${this.baseURL}/api/v5/market/ticker`, {
        params: { instId }
      });
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        return response.data.data[0];
      }
      throw new Error('Failed to fetch market data');
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  async getAccountBalance(): Promise<AccountBalance> {
    if (!this.credentials) throw new Error('API credentials not set');

    try {
      const requestPath = '/api/v5/account/balance';
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await axios.get(`${this.baseURL}${requestPath}`, { headers });
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        return response.data.data[0];
      }
      throw new Error('Failed to fetch account balance');
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw error;
    }
  }

  async placeOrder(order: TradeOrder): Promise<any> {
    if (!this.credentials) throw new Error('API credentials not set');

    try {
      const requestPath = '/api/v5/trade/order';
      const body = JSON.stringify(order);
      const headers = this.getHeaders('POST', requestPath, body);
      
      const response = await axios.post(`${this.baseURL}${requestPath}`, order, { headers });
      
      if (response.data.code === '0') {
        return response.data.data[0];
      }
      throw new Error(response.data.msg || 'Failed to place order');
    } catch (error) {
      console.error('Error placing order:', error);
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
