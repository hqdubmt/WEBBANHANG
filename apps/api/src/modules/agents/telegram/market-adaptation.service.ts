import { Injectable, Logger } from '@nestjs/common';

interface AdaptationRecord {
  field: string;
  oldValue: string | number;
  newValue: string | number;
  timestamp: number;
}

@Injectable()
export class MarketAdaptationService {
  private readonly logger = new Logger(MarketAdaptationService.name);

  currentNiche = 'electronics';
  currentContentType = 'review';
  currentChannel = 'telegram';
  bestPostingHour = 20;

  private adaptationHistory: AdaptationRecord[] = [];

  private record(field: string, oldValue: string | number, newValue: string | number): void {
    this.adaptationHistory.push({ field, oldValue, newValue, timestamp: Date.now() });
    if (this.adaptationHistory.length > 100) this.adaptationHistory.shift();
  }

  adaptNiche(data: Record<string, number>): void {
    let best = this.currentNiche;
    let bestVal = -Infinity;
    for (const [niche, val] of Object.entries(data)) {
      if (val > bestVal) { bestVal = val; best = niche; }
    }
    if (best !== this.currentNiche) {
      this.record('niche', this.currentNiche, best);
      this.logger.log(`Niche adapted: ${this.currentNiche} -> ${best} (revenue: ${bestVal})`);
      this.currentNiche = best;
    }
  }

  adaptChannel(data: Record<string, number>): void {
    let best = this.currentChannel;
    let bestVal = -Infinity;
    for (const [channel, val] of Object.entries(data)) {
      if (val > bestVal) { bestVal = val; best = channel; }
    }
    if (best !== this.currentChannel) {
      this.record('channel', this.currentChannel, best);
      this.logger.log(`Channel adapted: ${this.currentChannel} -> ${best}`);
      this.currentChannel = best;
    }
  }

  adaptTiming(hourlyData: number[]): void {
    if (hourlyData.length !== 24) return;
    const bestHour = hourlyData.indexOf(Math.max(...hourlyData));
    if (bestHour !== this.bestPostingHour) {
      this.record('bestPostingHour', this.bestPostingHour, bestHour);
      this.logger.log(`Timing adapted: hour ${this.bestPostingHour} -> ${bestHour}`);
      this.bestPostingHour = bestHour;
    }
  }

  getAdaptations() {
    return {
      currentNiche: this.currentNiche,
      currentContentType: this.currentContentType,
      currentChannel: this.currentChannel,
      bestPostingHour: this.bestPostingHour,
    };
  }

  getStats() {
    return {
      ...this.getAdaptations(),
      totalAdaptations: this.adaptationHistory.length,
      recentAdaptations: this.adaptationHistory.slice(-5),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
