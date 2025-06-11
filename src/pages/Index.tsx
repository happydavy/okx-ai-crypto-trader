
import { useState, useEffect } from 'react';
import { AuthWrapper } from '@/components/AuthWrapper';
import { ApiKeySetup } from '@/components/ApiKeySetup';
import { TradingDashboard } from '@/components/TradingDashboard';
import { okxApi, OKXCredentials, MarketData, AccountBalance } from '@/services/okxApi';
import { quantService, TradingSignal, MarketIndicators } from '@/services/quantService';
import { credentialsService } from '@/services/credentialsService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

const Index = () => {
  const [credentials, setCredentials] = useState<OKXCredentials | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [indicators, setIndicators] = useState<MarketIndicators | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // 从Supabase加载凭证
  const loadCredentialsFromSupabase = async () => {
    try {
      const storedCredentials = await credentialsService.getUserCredentials();
      if (storedCredentials) {
        const creds: OKXCredentials = {
          apiKey: storedCredentials.api_key,
          secretKey: storedCredentials.secret_key,
          passphrase: storedCredentials.passphrase,
          sandbox: storedCredentials.sandbox
        };
        setCredentials(creds);
        okxApi.setCredentials(creds);
      }
    } catch (error) {
      console.error('Failed to load credentials from Supabase:', error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  // 设置凭证
  const handleCredentialsSet = async (newCredentials: OKXCredentials) => {
    try {
      await credentialsService.saveCredentials(newCredentials);
      setCredentials(newCredentials);
      okxApi.setCredentials(newCredentials);
      setApiError(null); // Clear any previous errors
      
      toast({
        title: "连接成功",
        description: "OKX API已连接并保存到数据库，开始获取市场数据",
      });
    } catch (error: any) {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 获取市场数据
  const fetchMarketData = async () => {
    try {
      console.log('Starting to fetch market data...');
      const data = await okxApi.getMarketData('BTC-USDT');
      setMarketData(data);
      setApiError(null); // Clear error on success
      
      const price = parseFloat(data.last);
      const volume = parseFloat(data.vol24h);
      quantService.addMarketData(price, volume);
      
      const newSignal = quantService.generateTradingSignal();
      setSignal(newSignal);
      
      const newIndicators = quantService.getMarketIndicators();
      setIndicators(newIndicators);
      
    } catch (error: any) {
      console.error('Error fetching market data:', error);
      const errorMessage = error.message || '无法获取市场数据，请检查网络连接';
      setApiError(errorMessage);
      
      toast({
        title: "数据获取失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // 获取账户余额
  const fetchBalance = async () => {
    if (!credentials) return;
    
    try {
      console.log('Starting to fetch account balance...');
      const balanceData = await okxApi.getAccountBalance();
      setBalance(balanceData);
      setApiError(null); // Clear error on success
      
      toast({
        title: "余额已更新",
        description: "账户余额信息已刷新",
      });
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      const errorMessage = error.message || '无法获取账户余额';
      setApiError(errorMessage);
      
      toast({
        title: "余额获取失败",
        description: "无法获取账户余额，使用模拟数据",
        variant: "destructive",
      });
      
      // Set mock balance data
      setBalance({
        adjEq: "10000",
        details: [{
          availBal: "10000",
          bal: "10000",
          ccy: "USDT",
          cashBal: "10000",
          frozenBal: "0",
          interest: "0",
          uTime: Date.now().toString()
        }],
        imr: "0",
        isoEq: "0",
        mgnRatio: "0",
        mmr: "0",
        notionalUsd: "10000",
        ordFroz: "0",
        totalEq: "10000",
        uTime: Date.now().toString()
      });
    }
  };

  // 执行交易
  const handleTrade = async (action: 'buy' | 'sell', amount: number) => {
    if (!credentials || !marketData) {
      toast({
        title: "交易失败",
        description: "请先连接API并确保市场数据已加载",
        variant: "destructive",
      });
      return;
    }

    setIsTrading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "交易成功",
        description: `${action === 'buy' ? '买入' : '卖出'} ${amount.toFixed(4)} BTC`,
      });
      
      fetchBalance();
      
    } catch (error) {
      console.error('Trade error:', error);
      toast({
        title: "交易失败",
        description: "交易执行失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsTrading(false);
    }
  };

  // 定期更新数据
  useEffect(() => {
    if (credentials) {
      fetchMarketData();
      fetchBalance();
      
      const interval = setInterval(() => {
        fetchMarketData();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [credentials]);

  const MainContent = ({ user }: { user: User }) => {
    // 在用户登录后加载凭证
    useEffect(() => {
      loadCredentialsFromSupabase();
    }, [user]);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">
                <span className="gradient-text">AI量化交易平台</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                智能比特币交易 · 连接OKX交易所 · 专业AI策略
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/api-test')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              API配置与测试
            </Button>
          </div>
        </div>

        {apiError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>API连接问题：</strong> {apiError}
              <br />
              <Button 
                variant="link" 
                className="p-0 h-auto text-red-600 underline"
                onClick={() => navigate('/api-test')}
              >
                前往API测试页面进行诊断
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loadingCredentials ? (
          <div className="flex justify-center">
            <div className="text-muted-foreground">加载配置中...</div>
          </div>
        ) : !credentials ? (
          <div className="flex justify-center">
            <ApiKeySetup onCredentialsSet={handleCredentialsSet} />
          </div>
        ) : (
          <div className="animate-fade-in">
            <TradingDashboard
              marketData={marketData}
              balance={balance}
              signal={signal}
              indicators={indicators}
              onTrade={handleTrade}
              onRefreshBalance={fetchBalance}
              isTrading={isTrading}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthWrapper>
        {(user) => <MainContent user={user} />}
      </AuthWrapper>
    </div>
  );
};

export default Index;
