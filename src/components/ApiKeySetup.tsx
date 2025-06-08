
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EyeIcon, EyeOffIcon, Loader2 } from 'lucide-react';
import { OKXCredentials, okxApi } from '@/services/okxApi';

interface ApiKeySetupProps {
  onCredentialsSet: (credentials: OKXCredentials) => void;
  credentials?: OKXCredentials;
}

export const ApiKeySetup = ({ onCredentialsSet, credentials }: ApiKeySetupProps) => {
  const [formData, setFormData] = useState<OKXCredentials>({
    apiKey: credentials?.apiKey || '',
    secretKey: credentials?.secretKey || '',
    passphrase: credentials?.passphrase || '',
    sandbox: credentials?.sandbox || false
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    isVerifying: boolean;
    isValid: boolean | null;
    error?: string;
  }>({
    isVerifying: false,
    isValid: null
  });

  const handleVerify = async () => {
    if (!formData.apiKey || !formData.secretKey || !formData.passphrase) {
      setVerificationStatus({
        isVerifying: false,
        isValid: false,
        error: '请填写所有必需字段'
      });
      return;
    }

    setVerificationStatus({ isVerifying: true, isValid: null });
    
    // Set credentials temporarily for verification
    okxApi.setCredentials(formData);
    
    try {
      const result = await okxApi.verifyCredentials();
      setVerificationStatus({
        isVerifying: false,
        isValid: result.isValid,
        error: result.error
      });
    } catch (error) {
      setVerificationStatus({
        isVerifying: false,
        isValid: false,
        error: '验证过程中发生错误'
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationStatus.isValid) {
      onCredentialsSet(formData);
    } else {
      handleVerify();
    }
  };

  const handleInputChange = (field: keyof OKXCredentials, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset verification status when credentials change
    setVerificationStatus({ isVerifying: false, isValid: null });
  };

  const isFormValid = formData.apiKey && formData.secretKey && formData.passphrase;

  return (
    <Card className="w-full max-w-md mx-auto glass-effect">
      <CardHeader className="text-center">
        <CardTitle className="gradient-text text-xl">OKX API 配置</CardTitle>
        <CardDescription>
          连接您的OKX账户以开始量化交易
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type={showSecrets ? "text" : "password"}
              value={formData.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="输入您的API Key"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret Key</Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecrets ? "text" : "password"}
                value={formData.secretKey}
                onChange={(e) => handleInputChange('secretKey', e.target.value)}
                placeholder="输入您的Secret Key"
                className="font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input
              id="passphrase"
              type={showSecrets ? "text" : "password"}
              value={formData.passphrase}
              onChange={(e) => handleInputChange('passphrase', e.target.value)}
              placeholder="输入您的Passphrase"
              className="font-mono"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="sandbox"
              checked={formData.sandbox}
              onCheckedChange={(checked) => handleInputChange('sandbox', checked)}
            />
            <Label htmlFor="sandbox">测试环境</Label>
          </div>

          {verificationStatus.isValid === true && (
            <Alert className="border-success/20 bg-success/10">
              <AlertDescription className="text-success">
                ✅ API配置已验证，连接成功！
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus.isValid === false && verificationStatus.error && (
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertDescription className="text-destructive">
                ❌ {verificationStatus.error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {!verificationStatus.isValid && (
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleVerify}
                disabled={!isFormValid || verificationStatus.isVerifying}
              >
                {verificationStatus.isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    验证中...
                  </>
                ) : (
                  '验证API密钥'
                )}
              </Button>
            )}

            <Button 
              type="submit" 
              className="w-full gradient-bg hover:opacity-90 transition-opacity"
              disabled={!isFormValid || (!verificationStatus.isValid && !verificationStatus.isVerifying)}
            >
              {verificationStatus.isValid ? '连接OKX账户' : '验证并连接'}
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 提示：您的API密钥将安全存储在本地浏览器中，不会发送到任何第三方服务器
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
