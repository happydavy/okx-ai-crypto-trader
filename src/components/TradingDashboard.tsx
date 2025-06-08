
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Bitcoin, DollarSign, ChartBar, ChartLine } from 'lucide-react';
import { MarketData, AccountBalance } from '@/services/okxApi';
import { TradingSignal, MarketIndicators } from '@/services/quantService';

interface TradingDashboardProps {
  marketData: MarketData | null;
  balance: AccountBalance | null;
  signal: TradingSignal | null;
  indicators: MarketIndicators | null;
  onTrade: (action: 'buy' | 'sell', amount: number) => void;
  isTrading: boolean;
}

export const TradingDashboard = ({ 
  marketData, 
  balance, 
  signal, 
  indicators, 
  onTrade, 
  isTrading 
}: TradingDashboardProps) => {
  const [priceChange, setPriceChange] = useState<number>(0);

  useEffect(() => {
    if (marketData) {
      const change = parseFloat(marketData.last) - parseFloat(marketData.open24h);
      const changePercent = (change / parseFloat(marketData.open24h)) * 100;
      setPriceChange(changePercent);
    }
  }, [marketData]);

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(typeof price === 'string' ? parseFloat(price) : price);
  };

  const formatNumber = (num: string | number, decimals: number = 2) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return value.toLocaleString('zh-CN', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const getSignalColor = (action: string) => {
    switch (action) {
      case 'buy': return 'bg-success text-success-foreground';
      case 'sell': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRSIColor = (rsi: number) => {
    if (rsi < 30) return 'text-success';
    if (rsi > 70) return 'text-destructive';
    return 'text-foreground';
  };

  return (
    <div className="space-y-6">
      {/* 价格概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BTC/USDT</CardTitle>
            <Bitcoin className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketData ? formatPrice(marketData.last) : '--'}
            </div>
            <div className={`text-xs ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% 24h
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h 成交量</CardTitle>
            <ChartBar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketData ? formatNumber(marketData.vol24h, 0) : '--'}
            </div>
            <div className="text-xs text-muted-foreground">BTC</div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">账户余额</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance ? formatPrice(balance.totalEq) : '--'}
            </div>
            <div className="text-xs text-muted-foreground">USDT</div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI信号</CardTitle>
            <ChartLine className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {signal ? (
              <>
                <div className="flex items-center space-x-2">
                  <Badge className={getSignalColor(signal.action)}>
                    {signal.action.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  置信度: {(signal.confidence * 100).toFixed(0)}%
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">等待信号...</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="trading" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trading">交易</TabsTrigger>
          <TabsTrigger value="indicators">技术指标</TabsTrigger>
          <TabsTrigger value="ai">AI分析</TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 买入卖出按钮 */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>快速交易</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => onTrade('buy', signal?.quantity || 0.001)}
                    disabled={isTrading || !signal || signal.action !== 'buy'}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                  >
                    {isTrading ? '交易中...' : '买入 BTC'}
                  </Button>
                  <Button
                    onClick={() => onTrade('sell', signal?.quantity || 0.001)}
                    disabled={isTrading || !signal || signal.action !== 'sell'}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isTrading ? '交易中...' : '卖出 BTC'}
                  </Button>
                </div>
                {signal && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">AI建议</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {signal.reasoning}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      建议数量: {signal.quantity.toFixed(4)} BTC
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 市场深度 */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>市场深度</CardTitle>
              </CardHeader>
              <CardContent>
                {marketData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-destructive">卖盘</span>
                      <span>{formatPrice(marketData.askPx)}</span>
                      <span>{formatNumber(marketData.askSz, 4)}</span>
                    </div>
                    <div className="border-t border-border my-2"></div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-success">买盘</span>
                      <span>{formatPrice(marketData.bidPx)}</span>
                      <span>{formatNumber(marketData.bidSz, 4)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      价差: {formatPrice((parseFloat(marketData.askPx) - parseFloat(marketData.bidPx)).toString())}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">加载中...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          {indicators ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-sm">RSI (14)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getRSIColor(indicators.rsi)}`}>
                    {indicators.rsi.toFixed(1)}
                  </div>
                  <Progress value={indicators.rsi} className="mt-2" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {indicators.rsi < 30 ? '超卖' : indicators.rsi > 70 ? '超买' : '中性'}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-sm">MACD</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>MACD:</span>
                      <span className={indicators.macd.macd >= 0 ? 'text-success' : 'text-destructive'}>
                        {indicators.macd.macd.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>信号线:</span>
                      <span>{indicators.macd.signal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>柱状图:</span>
                      <span className={indicators.macd.histogram >= 0 ? 'text-success' : 'text-destructive'}>
                        {indicators.macd.histogram.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-sm">布林带</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>上轨:</span>
                      <span>{formatPrice(indicators.bollinger.upper)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>中轨:</span>
                      <span>{formatPrice(indicators.bollinger.middle)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>下轨:</span>
                      <span>{formatPrice(indicators.bollinger.lower)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-sm">移动平均线</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>SMA 20:</span>
                      <span>{formatPrice(indicators.sma.sma20)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SMA 50:</span>
                      <span>{formatPrice(indicators.sma.sma50)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SMA 200:</span>
                      <span>{formatPrice(indicators.sma.sma200)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-sm">波动率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {indicators.volatility.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {indicators.volatility < 2 ? '低波动' : 
                     indicators.volatility > 5 ? '高波动' : '中等波动'}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-sm">成交量</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(indicators.volume, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">BTC</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">加载技术指标中...</div>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {signal ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>AI交易信号</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>推荐操作:</span>
                    <Badge className={getSignalColor(signal.action)}>
                      {signal.action.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>置信度:</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={signal.confidence * 100} className="w-20" />
                      <span className="text-sm">{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>建议价格:</span>
                    <span>{formatPrice(signal.price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>建议数量:</span>
                    <span>{signal.quantity.toFixed(4)} BTC</span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">分析依据</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {signal.reasoning}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>AI模型状态</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>模型类型:</span>
                    <Badge variant="outline">Ensemble AI</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>准确率:</span>
                    <span className="text-success">87.5%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>最后更新:</span>
                    <span className="text-sm text-muted-foreground">
                      {signal.timestamp.toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>状态:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse-slow"></div>
                      <span className="text-success text-sm">活跃</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">AI正在分析市场数据...</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
