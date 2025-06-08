
import { supabase } from '@/integrations/supabase/client';
import { OKXCredentials } from './okxApi';

export interface StoredCredentials extends OKXCredentials {
  id: string;
  user_id: string;
  api_key: string;
  secret_key: string;
  passphrase: string;
  sandbox: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const credentialsService = {
  // 获取用户的API凭证
  async getUserCredentials(): Promise<StoredCredentials | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('用户未登录');

    const { data, error } = await supabase
      .from('okx_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!data) return null;

    // 转换数据库字段到接口格式
    return {
      ...data,
      apiKey: data.api_key,
      secretKey: data.secret_key,
    };
  },

  // 保存或更新API凭证
  async saveCredentials(credentials: OKXCredentials): Promise<StoredCredentials> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('用户未登录');

    // 首先将现有的凭证设为非活跃状态
    await supabase
      .from('okx_credentials')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // 插入新的凭证
    const { data, error } = await supabase
      .from('okx_credentials')
      .insert({
        user_id: user.id,
        api_key: credentials.apiKey,
        secret_key: credentials.secretKey,
        passphrase: credentials.passphrase,
        sandbox: credentials.sandbox || false,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    // 转换数据库字段到接口格式
    return {
      ...data,
      apiKey: data.api_key,
      secretKey: data.secret_key,
    };
  },

  // 删除API凭证
  async deleteCredentials(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('用户未登录');

    const { error } = await supabase
      .from('okx_credentials')
      .update({ is_active: false })
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
  },

  // 验证凭证格式
  validateCredentials(credentials: OKXCredentials): { isValid: boolean; error?: string } {
    const apiKey = credentials.apiKey.trim();
    const secretKey = credentials.secretKey.trim();
    const passphrase = credentials.passphrase.trim();

    if (!apiKey || !secretKey || !passphrase) {
      return { isValid: false, error: '请确保所有字段都已填写完整' };
    }

    const apiKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!apiKeyPattern.test(apiKey)) {
      return { isValid: false, error: 'API Key格式不正确，应为UUID格式' };
    }

    if (secretKey.length < 20) {
      return { isValid: false, error: 'Secret Key长度不正确，请检查是否完整复制' };
    }

    if (passphrase.length < 1 || passphrase.length > 30) {
      return { isValid: false, error: 'Passphrase长度应在1-30个字符之间' };
    }

    return { isValid: true };
  }
};
