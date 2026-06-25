import { Injectable, Logger } from '@nestjs/common';
import { EventCollectorService } from './event-collector.service';

export interface ChannelWeight {
  channel: string;
  weight: number;     // 0.0 – 2.0 (1.0 = baseline)
  clicks24h: number;
  share: number;      // % of total clicks
  trend: 'UP' | 'STABLE' | 'DOWN';
  updatedAt: Date;
}

// Baseline weights — hệ thống bắt đầu từ đây
const BASELINE: Record<string, number> = {
  telegram: 1.0,
  facebook: 0.8,
  discord: 0.6,
  zalo: 0.7,
  n8n: 0.5,
  youtube: 0.4,
};

const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 2.0;

@Injectable()
export class SmartDistributionService {
  private readonly logger = new Logger(SmartDistributionService.name);
  private readonly weights = new Map<string, number>(Object.entries(BASELINE));
  private previousClicks: Record<string, number> = {};

  constructor(private readonly events: EventCollectorService) {}

  // Recalibrate weights dựa trên click data thật — gọi mỗi loop
  recalibrate(): Record<string, ChannelWeight> {
    const clicks24h = this.events.getClicksByChannel(86_400_000);
    const clicks48h = this.events.getClicksByChannel(2 * 86_400_000);

    const total24h = Object.values(clicks24h).reduce((a, b) => a + b, 0);

    const result: Record<string, ChannelWeight> = {};

    for (const channel of new Set([...Object.keys(clicks24h), ...this.weights.keys()])) {
      const current = clicks24h[channel] || 0;
      const prev = this.previousClicks[channel] || 0;
      const total48 = clicks48h[channel] || 0;
      const share = total24h > 0 ? (current / total24h) * 100 : 0;

      // Điều chỉnh weight: kênh có nhiều click → tăng weight, ít click → giảm
      const currentWeight = this.weights.get(channel) || BASELINE[channel] || 0.5;
      let newWeight = currentWeight;

      if (total24h > 0 && current > 0) {
        // Kênh đang đóng góp nhiều hơn baseline → tăng nhẹ
        const relativePerf = share / (100 / Math.max(1, Object.keys(clicks24h).length));
        if (relativePerf > 1.2) {
          newWeight = Math.min(MAX_WEIGHT, currentWeight * 1.1);
        } else if (relativePerf < 0.5) {
          newWeight = Math.max(MIN_WEIGHT, currentWeight * 0.9);
        }
      } else if (current === 0 && currentWeight > MIN_WEIGHT) {
        // Kênh không có click → giảm nhẹ
        newWeight = Math.max(MIN_WEIGHT, currentWeight * 0.95);
      }

      newWeight = Math.round(newWeight * 100) / 100;
      this.weights.set(channel, newWeight);

      // Trend: so với 24h trước
      const trend: 'UP' | 'STABLE' | 'DOWN' =
        current > prev * 1.1 ? 'UP' :
        current < prev * 0.9 ? 'DOWN' : 'STABLE';

      result[channel] = {
        channel,
        weight: newWeight,
        clicks24h: current,
        share: Math.round(share),
        trend,
        updatedAt: new Date(),
      };
    }

    this.previousClicks = { ...clicks24h };

    const summary = Object.values(result)
      .sort((a, b) => b.clicks24h - a.clicks24h)
      .map(c => `${c.channel}:${c.weight}(${c.trend})`)
      .join(' ');
    this.logger.log(`Smart Distribution recalibrated: ${summary}`);

    return result;
  }

  getWeight(channel: string): number {
    return this.weights.get(channel) ?? BASELINE[channel] ?? 0.5;
  }

  getAllWeights(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [ch, w] of this.weights) out[ch] = w;
    return out;
  }

  // Chọn kênh phân phối theo weight — probabilistic selection
  selectChannels(available: string[], count: number): string[] {
    const weightedChannels = available.map(ch => ({
      channel: ch,
      weight: this.getWeight(ch),
    }));

    const totalWeight = weightedChannels.reduce((s, c) => s + c.weight, 0);
    if (totalWeight === 0) return available.slice(0, count);

    // Sort theo weight desc, lấy top N
    return weightedChannels
      .sort((a, b) => b.weight - a.weight)
      .slice(0, count)
      .map(c => c.channel);
  }

  resetToBaseline(): void {
    this.weights.clear();
    for (const [ch, w] of Object.entries(BASELINE)) {
      this.weights.set(ch, w);
    }
    this.logger.log('Smart Distribution: weights reset to baseline');
  }
}
