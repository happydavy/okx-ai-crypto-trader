import { useState, useEffect } from 'react';
import { ApiKeySetup } from '@/components/ApiKeySetup';
import { TradingDashboard } from '@/components/TradingDashboard';
import { okxApi, OKXCredentials, MarketData, AccountBalance } from '@/services/okxApi';
import { quantService, TradingSignal, MarketIndicators } from '@/services/quantService';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [credentials, setCredentials] = useState<OKXCredentials | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [indicators, setIndicators] = useState<MarketIndicators | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const { toast } = useToast();

  // 从localStorage加载凭证
  useEffect(() => {
    const saved = localStorage.getItem('okx-credentials');
    if (saved) {
      try {
        const parsedCredentials = JSON.parse(saved);
        setCredentials(parsedCredentials);
        okxApi.setCredentials(parsedCredentials);
      } catch (error) {
        console.error('Failed to parse saved credentials:', error);
      }
    }
  }, []);

  // 设置凭证
  const handleCredentialsSet = (newCredentials: OKXCredentials) => {
    setCredentials(newCredentials);
    okxApi.setCredentials(newCredentials);
    localStorage.setItem('okx-credentials', JSON.stringify(newCredentials));
    
    toast({
      title: "连接成功",
      description: "OKX API已连接，开始获取市场数据",
    });
  };

  // 获取市场数据
  const fetchMarketData = async () => {
    try {
      const data = await okxApi.getMarketData('BTC-USDT');
      setMarketData(data);
      
      // 更新量化服务的市场数据
      const price = parseFloat(data.last);
      const volume = parseFloat(data.vol24h);
      quantService.addMarketData(price, volume);
      
      // 生成新的交易信号
      const newSignal = quantService.generateTradingSignal();
      setSignal(newSignal);
      
      // 获取技术指标
      const newIndicators = quantService.getMarketIndicators();
      setIndicators(newIndicators);
      
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({
        title: "数据获取失败",
        description: "无法获取市场数据，请检查网络连接",
        variant: "destructive",
      });
    }
  };

  // 获取账户余额
  const fetchBalance = async () => {
    if (!credentials) return;
    
    try {
      const balanceData = await okxApi.getAccountBalance();
      setBalance(balanceData);
      
      toast({
        title: "余额已更新",
        description: "账户余额信息已刷新",
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: "余额获取失败",
        description: "无法获取账户余额，使用模拟数据",
        variant: "destructive",
      });
      
      // 模拟数据用于演示
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
      // 模拟交易执行（在实际环境中会调用真实的API）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "交易成功",
        description: `${action === 'buy' ? '买入' : '卖出'} ${amount.toFixed(4)} BTC`,
      });
      
      // 更新余额
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
      }, 10000); // 每10秒更新一次
      
      return () => clearInterval(interval);
    }
  }, [credentials]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">AI量化交易平台</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            智能比特币交易 · 连接OKX交易所 · 专业AI策略
          </p>
        </div>

        {!credentials ? (
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
    </div>
  );
};

export default Index;
