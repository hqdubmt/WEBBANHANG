import { Injectable, Logger } from '@nestjs/common';

export type EventType = 'click' | 'view' | 'post' | 'boost' | 'kill';

export interface RevenueEvent {
  id: string;
  type: EventType;
  productId: string;
  channel: string;  // telegram | facebook | discord | zalo | n8n
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export interface HourlyStats {
  hour: number;
  clicks: number;
  views: number;
  posts: number;
}

@Injectable()
export class EventCollectorService {
  private readonly logger = new Logger(EventCollectorService.name);
  private readonly events: RevenueEvent[] = [];
  private counter = 0;

  private genId(): string {
    return `ev_${Date.now()}_${++this.counter}`;
  }

  emit(type: EventType, productId: string, channel: string, meta?: Record<string, unknown>): void {
    const event: RevenueEvent = {
      id: this.genId(),
      type,
      productId,
      channel,
      timestamp: new Date(),
      meta,
    };
    this.events.push(event);

    // Giữ tối đa 10,000 events trong memory
    if (this.events.length > 10_000) {
      this.events.splice(0, this.events.length - 10_000);
    }
  }

  // Lấy events theo productId
  getByProduct(productId: string): RevenueEvent[] {
    return this.events.filter(e => e.productId === productId);
  }

  // Lấy events theo type trong khoảng thời gian
  getByType(type: EventType, sinceMs?: number): RevenueEvent[] {
    const cutoff = sinceMs ? Date.now() - sinceMs : 0;
    return this.events.filter(e => e.type === type && e.timestamp.getTime() >= cutoff);
  }

  // Click counts per product
  getClickCounts(sinceMs?: number): Record<string, number> {
    const clicks = this.getByType('click', sinceMs);
    const map: Record<string, number> = {};
    for (const e of clicks) {
      map[e.productId] = (map[e.productId] || 0) + 1;
    }
    return map;
  }

  // View counts per product
  getViewCounts(sinceMs?: number): Record<string, number> {
    const views = this.getByType('view', sinceMs);
    const map: Record<string, number> = {};
    for (const e of views) {
      map[e.productId] = (map[e.productId] || 0) + 1;
    }
    return map;
  }

  // Clicks per channel trong 24h
  getClicksByChannel(sinceMs = 86_400_000): Record<string, number> {
    const map: Record<string, number> = {};
    for (const e of this.getByType('click', sinceMs)) {
      map[e.channel] = (map[e.channel] || 0) + 1;
    }
    return map;
  }

  // Phân tích giờ nào có nhiều click nhất (24h gần nhất)
  getHourlyStats(): HourlyStats[] {
    const buckets: Record<number, HourlyStats> = {};
    const cutoff = Date.now() - 7 * 86_400_000; // 7 ngày

    for (const e of this.events) {
      if (e.timestamp.getTime() < cutoff) continue;
      const hour = e.timestamp.getHours();
      if (!buckets[hour]) buckets[hour] = { hour, clicks: 0, views: 0, posts: 0 };
      if (e.type === 'click') buckets[hour].clicks++;
      if (e.type === 'view') buckets[hour].views++;
      if (e.type === 'post') buckets[hour].posts++;
    }

    return Array.from({ length: 24 }, (_, h) => buckets[h] || { hour: h, clicks: 0, views: 0, posts: 0 });
  }

  getStats() {
    const total = this.events.length;
    const byType: Record<string, number> = {};
    for (const e of this.events) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }
    return { total, byType, oldestEvent: this.events[0]?.timestamp, newestEvent: this.events[this.events.length - 1]?.timestamp };
  }
}
