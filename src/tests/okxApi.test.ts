
import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { okxApi, OKXCredentials } from '../services/okxApi';
import { credentialsService } from '../services/credentialsService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('OKX API 连接测试', () => {
  const testCredentials: OKXCredentials = {
    apiKey: '12345678-1234-1234-1234-123456789abc',
    secretKey: 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ',
    passphrase: 'testPassphrase123',
    sandbox: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    okxApi.setCredentials(testCredentials);
  });

  describe('凭证验证', () => {
    it('应该验证有效的API凭证格式', () => {
      const result = credentialsService.validateCredentials(testCredentials);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝无效的API Key格式', () => {
      const invalidCredentials = {
        ...testCredentials,
        apiKey: 'invalid-api-key'
      };
      
      const result = credentialsService.validateCredentials(invalidCredentials);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API Key格式不正确，应为UUID格式');
    });

    it('应该拒绝过短的Secret Key', () => {
      const invalidCredentials = {
        ...testCredentials,
        secretKey: 'too-short'
      };
      
      const result = credentialsService.validateCredentials(invalidCredentials);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Secret Key长度不正确，请检查是否完整复制');
    });

    it('应该拒绝空的Passphrase', () => {
      const invalidCredentials = {
        ...testCredentials,
        passphrase: ''
      };
      
      const result = credentialsService.validateCredentials(invalidCredentials);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('请确保所有字段都已填写完整');
    });

    it('应该拒绝过长的Passphrase', () => {
      const invalidCredentials = {
        ...testCredentials,
        passphrase: 'a'.repeat(31)
      };
      
      const result = credentialsService.validateCredentials(invalidCredentials);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Passphrase长度应在1-30个字符之间');
    });
  });

  describe('API连接测试', () => {
    it('应该成功验证有效凭证', async () => {
      // Mock成功的API响应
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: '0',
          msg: '',
          data: [{
            totalEq: '10000',
            details: []
          }]
        }
      });

      const result = await okxApi.verifyCredentials();
      
      expect(result.isValid).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://us.okx.com/api/v5/account/balance',
        expect.objectContaining({
          headers: expect.objectContaining({
            'OK-ACCESS-KEY': testCredentials.apiKey,
            'OK-ACCESS-PASSPHRASE': testCredentials.passphrase,
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('应该处理API错误响应', async () => {
      // Mock API错误响应
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: '50001',
          msg: 'API key not found'
        }
      });

      const result = await okxApi.verifyCredentials();
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('API错误');
      expect(result.error).toContain('50001');
    });

    it('应该处理网络错误', async () => {
      // Mock网络错误
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'Network error'
      });

      const result = await okxApi.verifyCredentials();
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('网络连接失败，请检查网络设置');
    });

    it('应该处理401认证错误', async () => {
      // Mock 401错误
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            msg: 'Invalid signature'
          }
        }
      });

      const result = await okxApi.verifyCredentials();
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('认证失败');
    });

    it('应该处理403权限错误', async () => {
      // Mock 403错误
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            msg: 'Insufficient permissions'
          }
        }
      });

      const result = await okxApi.verifyCredentials();
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API密钥缺少必要权限，请确保已开启读取权限');
    });
  });

  describe('市场数据获取', () => {
    it('应该成功获取BTC-USDT市场数据', async () => {
      const mockMarketData = {
        instId: 'BTC-USDT',
        last: '45000',
        lastSz: '0.1',
        askPx: '45001',
        askSz: '0.5',
        bidPx: '44999',
        bidSz: '0.5',
        open24h: '44800',
        high24h: '45200',
        low24h: '44600',
        vol24h: '1000',
        ts: '1640995200000',
        sodUtc0: '44800',
        sodUtc8: '44800'
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: '0',
          data: [mockMarketData]
        }
      });

      const result = await okxApi.getMarketData('BTC-USDT');
      
      expect(result).toEqual(mockMarketData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://us.okx.com/api/v5/market/ticker',
        { params: { instId: 'BTC-USDT' } }
      );
    });

    it('应该在市场数据获取失败时抛出错误', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: '50004',
          data: []
        }
      });

      await expect(okxApi.getMarketData('INVALID-PAIR')).rejects.toThrow('Failed to fetch market data');
    });
  });

  describe('账户余额获取', () => {
    it('应该成功获取账户余额', async () => {
      const mockBalance = {
        adjEq: '10000',
        details: [{
          availBal: '10000',
          bal: '10000',
          ccy: 'USDT',
          cashBal: '10000',
          frozenBal: '0',
          interest: '0',
          uTime: '1640995200000'
        }],
        imr: '0',
        isoEq: '0',
        mgnRatio: '0',
        mmr: '0',
        notionalUsd: '10000',
        ordFroz: '0',
        totalEq: '10000',
        uTime: '1640995200000'
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: '0',
          data: [mockBalance]
        }
      });

      const result = await okxApi.getAccountBalance();
      
      expect(result).toEqual(mockBalance);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://us.okx.com/api/v5/account/balance',
        expect.objectContaining({
          headers: expect.objectContaining({
            'OK-ACCESS-KEY': testCredentials.apiKey,
            'OK-ACCESS-PASSPHRASE': testCredentials.passphrase
          })
        })
      );
    });
  });

  describe('签名生成', () => {
    it('应该为API请求生成正确的请求头', async () => {
      // Mock成功响应以触发签名生成
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: '0',
          data: [{}]
        }
      });

      await okxApi.verifyCredentials();

      const callArgs = mockedAxios.get.mock.calls[0];
      const headers = callArgs[1]?.headers;

      expect(headers).toHaveProperty('OK-ACCESS-KEY', testCredentials.apiKey);
      expect(headers).toHaveProperty('OK-ACCESS-PASSPHRASE', testCredentials.passphrase);
      expect(headers).toHaveProperty('OK-ACCESS-SIGN');
      expect(headers).toHaveProperty('OK-ACCESS-TIMESTAMP');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });
  });
});
