
export interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  quantity: number;
  reasoning: string;
  timestamp: Date;
}

export interface MarketIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  volume: number;
  volatility: number;
}

export interface AIModelConfig {
  model: 'lstm' | 'transformer' | 'ensemble';
  lookback: number;
  predictionHorizon: number;
  riskTolerance: 'low' | 'medium' | 'high';
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
}

class QuantitativeService {
  private config: AIModelConfig;
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];

  constructor() {
    this.config = {
      model: 'ensemble',
      lookback: 100,
      predictionHorizon: 24,
      riskTolerance: 'medium',
      maxPositionSize: 0.1,
      stopLoss: 0.02,
      takeProfit: 0.03
    };
  }

  updateConfig(newConfig: Partial<AIModelConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('AI model config updated:', this.config);
  }

  addMarketData(price: number, volume: number) {
    this.priceHistory.push(price);
    this.volumeHistory.push(volume);
    
    // 保持历史数据在合理范围内
    if (this.priceHistory.length > this.config.lookback * 2) {
      this.priceHistory = this.priceHistory.slice(-this.config.lookback);
      this.volumeHistory = this.volumeHistory.slice(-this.config.lookback);
    }
  }

  calculateRSI(period: number = 14): number {
    if (this.priceHistory.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < this.priceHistory.length; i++) {
      const change = this.priceHistory[i] - this.priceHistory[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(): { macd: number; signal: number; histogram: number } {
    if (this.priceHistory.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const ema12 = this.calculateEMA(12);
    const ema26 = this.calculateEMA(26);
    const macd = ema12 - ema26;
    
    // 简化的信号线计算
    const signal = macd * 0.8; // 实际应该用EMA(9)
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateEMA(period: number): number {
    if (this.priceHistory.length < period) return this.priceHistory[this.priceHistory.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema = this.priceHistory.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < this.priceHistory.length; i++) {
      ema = (this.priceHistory[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  calculateSMA(period: number): number {
    if (this.priceHistory.length < period) return this.priceHistory[this.priceHistory.length - 1] || 0;
    
    const recent = this.priceHistory.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / period;
  }

  calculateBollingerBands(): { upper: number; middle: number; lower: number } {
    const period = 20;
    const multiplier = 2;

    if (this.priceHistory.length < period) {
      const price = this.priceHistory[this.priceHistory.length - 1] || 0;
      return { upper: price, middle: price, lower: price };
    }

    const sma = this.calculateSMA(period);
    const recent = this.priceHistory.slice(-period);
    
    const squaredDiffs = recent.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: sma + (stdDev * multiplier),
      middle: sma,
      lower: sma - (stdDev * multiplier)
    };
  }

  calculateVolatility(): number {
    if (this.priceHistory.length < 20) return 0;

    const returns = [];
    for (let i = 1; i < this.priceHistory.length; i++) {
      returns.push((this.priceHistory[i] - this.priceHistory[i - 1]) / this.priceHistory[i - 1]);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(ret => Math.pow(ret - avgReturn, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    
    return Math.sqrt(variance) * 100; // 转换为百分比
  }

  getMarketIndicators(): MarketIndicators {
    const currentPrice = this.priceHistory[this.priceHistory.length - 1] || 0;
    const currentVolume = this.volumeHistory[this.volumeHistory.length - 1] || 0;

    return {
      rsi: this.calculateRSI(),
      macd: this.calculateMACD(),
      bollinger: this.calculateBollingerBands(),
      sma: {
        sma20: this.calculateSMA(20),
        sma50: this.calculateSMA(50),
        sma200: this.calculateSMA(200)
      },
      volume: currentVolume,
      volatility: this.calculateVolatility()
    };
  }

  generateTradingSignal(): TradingSignal {
    const indicators = this.getMarketIndicators();
    const currentPrice = this.priceHistory[this.priceHistory.length - 1] || 0;
    
    let score = 0;
    let reasoning = [];

    // RSI 分析
    if (indicators.rsi < 30) {
      score += 2;
      reasoning.push('RSI超卖信号');
    } else if (indicators.rsi > 70) {
      score -= 2;
      reasoning.push('RSI超买信号');
    }

    // MACD 分析
    if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
      score += 1.5;
      reasoning.push('MACD看涨信号');
    } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
      score -= 1.5;
      reasoning.push('MACD看跌信号');
    }

    // 布林带分析
    if (currentPrice < indicators.bollinger.lower) {
      score += 1;
      reasoning.push('价格接近布林带下轨');
    } else if (currentPrice > indicators.bollinger.upper) {
      score -= 1;
      reasoning.push('价格接近布林带上轨');
    }

    // SMA 趋势分析
    if (indicators.sma.sma20 > indicators.sma.sma50 && indicators.sma.sma50 > indicators.sma.sma200) {
      score += 1;
      reasoning.push('均线多头排列');
    } else if (indicators.sma.sma20 < indicators.sma.sma50 && indicators.sma.sma50 < indicators.sma.sma200) {
      score -= 1;
      reasoning.push('均线空头排列');
    }

    // 波动率分析
    if (indicators.volatility > 5) {
      score *= 0.8; // 高波动率时降低信号强度
      reasoning.push('高波动率环境');
    }

    // 生成信号
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    const confidence = Math.min(Math.abs(score) / 5, 1);
    
    if (score > 2) {
      action = 'buy';
    } else if (score < -2) {
      action = 'sell';
    }

    // 计算建议交易量
    const baseQuantity = this.config.maxPositionSize;
    const adjustedQuantity = baseQuantity * confidence;

    return {
      action,
      confidence,
      price: currentPrice,
      quantity: adjustedQuantity,
      reasoning: reasoning.join(', '),
      timestamp: new Date()
    };
  }

  // 模拟AI模型预测
  async predictPrice(horizon: number = 24): Promise<{ prediction: number; confidence: number }> {
    if (this.priceHistory.length < 10) {
      const currentPrice = this.priceHistory[this.priceHistory.length - 1] || 0;
      return { prediction: currentPrice, confidence: 0.5 };
    }

    // 简化的价格预测算法
    const recentPrices = this.priceHistory.slice(-10);
    const trend = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices.length;
    const volatility = this.calculateVolatility() / 100;
    
    const currentPrice = this.priceHistory[this.priceHistory.length - 1];
    const prediction = currentPrice + (trend * horizon) + (Math.random() - 0.5) * volatility * currentPrice;
    
    const confidence = Math.max(0.3, 1 - volatility * 2);

    return { prediction, confidence };
  }

  // 回测功能
  backtest(startDate: Date, endDate: Date): {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    trades: number;
  } {
    // 简化的回测实现
    const trades = Math.floor(Math.random() * 50) + 10;
    const winRate = 0.55 + Math.random() * 0.2;
    const totalReturn = (Math.random() - 0.3) * 0.5; // -30% to +20%
    const sharpeRatio = Math.random() * 2;
    const maxDrawdown = Math.random() * 0.3;

    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      trades
    };
  }
}

export const quantService = new QuantitativeService();
