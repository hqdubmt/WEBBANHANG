import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

export interface MacroPrediction { type: 'trend' | 'hotProduct' | 'channel' | 'region'; prediction: string; confidence: number; createdAt: Date; }

@Injectable()
export class MacroEconomyPredictorService {
  private readonly logger = new Logger(MacroEconomyPredictorService.name);
  private predictions: MacroPrediction[] = [];

  predictTrend(history: number[]): { direction: 'up' | 'down' | 'flat'; confidence: number } {
    if (history.length < 2) return { direction: 'flat', confidence: 0.5 };
    const half = Math.floor(history.length / 2);
    const firstHalfAvg = history.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg = history.slice(half).reduce((a, b) => a + b, 0) / (history.length - half);
    const delta = (secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1);
    const confidence = Math.min(0.9, 0.5 + Math.abs(delta) * 2);
    return { direction: delta > 0.02 ? 'up' : delta < -0.02 ? 'down' : 'flat', confidence };
  }

  predictHotProduct(categoryRevenue: Record<string, number>): string {
    return Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || 'electronics';
  }

  predictChannelDecline(channelCtr: Record<string, number[]>): string[] {
    return Object.entries(channelCtr)
      .filter(([, ctrs]) => {
        if (ctrs.length < 3) return false;
        return ctrs[ctrs.length - 1] < ctrs[0] * 0.7;
      })
      .map(([ch]) => ch);
  }

  generatePredictions(): MacroPrediction[] {
    const newPreds: MacroPrediction[] = [
      { type: 'trend', prediction: 'revenue_up', confidence: 0.7, createdAt: new Date() },
      { type: 'hotProduct', prediction: 'electronics', confidence: 0.65, createdAt: new Date() },
      { type: 'channel', prediction: 'telegram_stable', confidence: 0.8, createdAt: new Date() },
    ];
    this.predictions.push(...newPreds);
    return newPreds;
  }

  @Cron('0 6 * * *')
  predictionLoop(): void {
    this.generatePredictions();
    this.logger.log(`Macro predictions generated: ${this.predictions.length} total`);
  }

  getStats() {
    return { totalPredictions: this.predictions.length, latest: this.predictions.slice(-3) };
  }
}
