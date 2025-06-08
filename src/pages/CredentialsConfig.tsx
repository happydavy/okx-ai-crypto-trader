
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EyeIcon, EyeOffIcon, Loader2, Save, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { credentialsService, StoredCredentials } from '@/services/credentialsService';
import { OKXCredentials, okxApi } from '@/services/okxApi';
import { useNavigate } from 'react-router-dom';

export const CredentialsConfig = () => {
  const [formData, setFormData] = useState<OKXCredentials>({
    apiKey: '',
    secretKey: '',
    passphrase: '',
    sandbox: false
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [existingCredentials, setExistingCredentials] = useState<StoredCredentials | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    isValid: boolean | null;
    error?: string;
  }>({ isValid: null });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // 加载现有凭证
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const credentials = await credentialsService.getUserCredentials();
      if (credentials) {
        setFormData({
          apiKey: credentials.api_key,
          secretKey: credentials.secret_key,
          passphrase: credentials.passphrase,
          sandbox: credentials.sandbox
        });
        setExistingCredentials(credentials);
      }
    } catch (error) {
      console.error('加载凭证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof OKXCredentials, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setVerificationStatus({ isValid: null });
  };

  const handleVerify = async () => {
    const validation = credentialsService.validateCredentials(formData);
    if (!validation.isValid) {
      setVerificationStatus({
        isValid: false,
        error: validation.error
      });
      return;
    }

    setVerifying(true);
    okxApi.setCredentials(formData);
    
    try {
      const result = await okxApi.verifyCredentials();
      setVerificationStatus({
        isValid: result.isValid,
        error: result.error
      });
    } catch (error) {
      setVerificationStatus({
        isValid: false,
        error: '验证过程中发生错误'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!verificationStatus.isValid) {
      await handleVerify();
      return;
    }

    setSaving(true);
    try {
      await credentialsService.saveCredentials(formData);
      toast({
        title: "保存成功",
        description: "OKX API凭证已安全保存",
      });
      await loadCredentials();
    } catch (error: any) {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingCredentials) return;

    try {
      await credentialsService.deleteCredentials();
      toast({
        title: "删除成功",
        description: "API凭证已删除",
      });
      setFormData({
        apiKey: '',
        secretKey: '',
        passphrase: '',
        sandbox: false
      });
      setExistingCredentials(null);
      setVerificationStatus({ isValid: null });
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isFormValid = formData.apiKey && formData.secretKey && formData.passphrase;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold">OKX API 配置</h1>
          <p className="text-muted-foreground">管理您的OKX交易所API凭证</p>
        </div>
      </div>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>API 凭证配置</CardTitle>
          <CardDescription>
            输入您的OKX API凭证以启用自动交易功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="sandbox">使用测试环境</Label>
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

          <div className="flex gap-2">
            {!verificationStatus.isValid && (
              <Button
                variant="outline"
                onClick={handleVerify}
                disabled={!isFormValid || verifying}
                className="flex-1"
              >
                {verifying ? (
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
              onClick={handleSave}
              disabled={!verificationStatus.isValid || saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存配置
                </>
              )}
            </Button>

            {existingCredentials && (
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 提示：您的API密钥将安全存储在Supabase数据库中，并使用行级安全策略保护，只有您本人可以访问
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
