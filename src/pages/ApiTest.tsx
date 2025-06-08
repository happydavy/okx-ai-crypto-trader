
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Play, CheckCircle, XCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { credentialsService } from '@/services/credentialsService';
import { okxApi, OKXCredentials } from '@/services/okxApi';

interface TestLog {
  id: string;
  timestamp: string;
  test: string;
  status: 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export const ApiTest = () => {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [credentials, setCredentials] = useState<OKXCredentials | null>(null);
  const navigate = useNavigate();

  const addLog = (test: string, status: TestLog['status'], message: string, details?: any) => {
    const log: TestLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      test,
      status,
      message,
      details
    };
    setLogs(prev => [...prev, log]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const loadCredentials = async () => {
    addLog('凭证加载', 'running', '正在加载API凭证...');
    try {
      const creds = await credentialsService.getUserCredentials();
      if (creds) {
        setCredentials({
          apiKey: creds.api_key,
          secretKey: creds.secret_key,
          passphrase: creds.passphrase,
          sandbox: creds.sandbox
        });
        addLog('凭证加载', 'success', '成功加载API凭证', {
          apiKey: creds.api_key.substring(0, 8) + '...',
          sandbox: creds.sandbox
        });
        return creds;
      } else {
        addLog('凭证加载', 'error', '未找到保存的API凭证，请先配置API密钥');
        return null;
      }
    } catch (error: any) {
      addLog('凭证加载', 'error', `加载凭证失败: ${error.message}`);
      return null;
    }
  };

  const testCredentialValidation = (creds: OKXCredentials) => {
    addLog('格式验证', 'running', '验证凭证格式...');
    const validation = credentialsService.validateCredentials(creds);
    if (validation.isValid) {
      addLog('格式验证', 'success', '凭证格式验证通过');
    } else {
      addLog('格式验证', 'error', `格式验证失败: ${validation.error}`);
    }
    return validation.isValid;
  };

  const testApiConnection = async (creds: OKXCredentials) => {
    addLog('API连接', 'running', '测试API连接...');
    okxApi.setCredentials(creds);
    
    try {
      const result = await okxApi.verifyCredentials();
      if (result.isValid) {
        addLog('API连接', 'success', 'API连接验证成功');
      } else {
        addLog('API连接', 'error', `API连接失败: ${result.error}`);
      }
      return result.isValid;
    } catch (error: any) {
      addLog('API连接', 'error', `连接测试异常: ${error.message}`);
      return false;
    }
  };

  const testAccountBalance = async () => {
    addLog('余额查询', 'running', '获取账户余额...');
    try {
      const balance = await okxApi.getAccountBalance();
      addLog('余额查询', 'success', '成功获取账户余额', {
        totalEq: balance.totalEq,
        availableAssets: balance.details.length
      });
      return true;
    } catch (error: any) {
      addLog('余额查询', 'error', `余额查询失败: ${error.message}`);
      return false;
    }
  };

  const testMarketData = async () => {
    addLog('市场数据', 'running', '获取BTC-USDT市场数据...');
    try {
      const marketData = await okxApi.getMarketData('BTC-USDT');
      addLog('市场数据', 'success', '成功获取市场数据', {
        instId: marketData.instId,
        last: marketData.last,
        vol24h: marketData.vol24h
      });
      return true;
    } catch (error: any) {
      addLog('市场数据', 'error', `市场数据获取失败: ${error.message}`);
      return false;
    }
  };

  const testTradingAccount = async () => {
    addLog('交易配置', 'running', '获取交易账户配置...');
    try {
      const config = await okxApi.getTradingAccount();
      addLog('交易配置', 'success', '成功获取交易配置', {
        acctLv: config.acctLv,
        posMode: config.posMode
      });
      return true;
    } catch (error: any) {
      addLog('交易配置', 'error', `交易配置获取失败: ${error.message}`);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearLogs();

    // 1. 加载凭证
    const creds = await loadCredentials();
    if (!creds) {
      setIsRunning(false);
      return;
    }

    const credentialsObj = {
      apiKey: creds.api_key,
      secretKey: creds.secret_key,
      passphrase: creds.passphrase,
      sandbox: creds.sandbox
    };

    // 2. 验证格式
    const isFormatValid = testCredentialValidation(credentialsObj);
    if (!isFormatValid) {
      setIsRunning(false);
      return;
    }

    // 3. 测试API连接
    const isConnectionValid = await testApiConnection(credentialsObj);
    if (!isConnectionValid) {
      setIsRunning(false);
      return;
    }

    // 4. 测试各项功能
    await testAccountBalance();
    await testMarketData();
    await testTradingAccount();

    addLog('测试完成', 'success', '所有API测试已完成');
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestLog['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestLog['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">运行中</Badge>;
      case 'success':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">成功</Badge>;
      case 'error':
        return <Badge variant="destructive">失败</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/credentials')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回配置
        </Button>
        <div>
          <h1 className="text-2xl font-bold">OKX API 测试工具</h1>
          <p className="text-muted-foreground">测试您的OKX API连接和功能</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
            <CardDescription>
              运行完整的API测试套件，验证所有功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    测试运行中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    开始测试
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={clearLogs}
                disabled={isRunning}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                测试将验证以下功能：
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>API凭证格式验证</li>
                  <li>API连接和认证</li>
                  <li>账户余额查询</li>
                  <li>市场数据获取</li>
                  <li>交易配置查询</li>
                </ul>
              </AlertDescription>
            </Alert>

            {credentials && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">当前配置:</p>
                <div className="space-y-1 text-xs">
                  <p>API Key: {credentials.apiKey.substring(0, 8)}...</p>
                  <p>环境: {credentials.sandbox ? '测试环境' : '生产环境'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 测试日志 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              测试日志
              <Badge variant="outline">{logs.length} 条记录</Badge>
            </CardTitle>
            <CardDescription>
              实时显示测试过程和结果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  暂无测试日志
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div key={log.id}>
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        {getStatusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{log.test}</span>
                            {getStatusBadge(log.status)}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {log.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.message}</p>
                          {log.details && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                      {index < logs.length - 1 && <Separator className="my-3" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
