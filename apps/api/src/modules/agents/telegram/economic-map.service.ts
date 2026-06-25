import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EconomicMapService {
  private readonly logger = new Logger(EconomicMapService.name);

  sectors: string[] = ['affiliate', 'content', 'ads'];
  channels: string[] = ['facebook', 'telegram', 'youtube'];
  sectorRevenue: Map<string, number> = new Map([
    ['affiliate', 5000],
    ['content', 3000],
    ['ads', 2500],
  ]);
  channelRevenue: Map<string, number> = new Map([
    ['facebook', 4000],
    ['telegram', 5500],
    ['youtube', 1000],
  ]);

  private heatmap: Map<string, Map<string, number>> = new Map();

  constructor() {
    for (const sector of this.sectors) {
      const row = new Map<string, number>();
      for (const channel of this.channels) {
        row.set(channel, Math.round(Math.random() * 2000));
      }
      this.heatmap.set(sector, row);
    }
  }

  recordRevenue(sector: string, channel: string, amount: number): void {
    const prevSector = this.sectorRevenue.get(sector) ?? 0;
    this.sectorRevenue.set(sector, prevSector + amount);
    const prevChannel = this.channelRevenue.get(channel) ?? 0;
    this.channelRevenue.set(channel, prevChannel + amount);

    if (!this.heatmap.has(sector)) this.heatmap.set(sector, new Map());
    const row = this.heatmap.get(sector)!;
    row.set(channel, (row.get(channel) ?? 0) + amount);
    this.logger.log(`Revenue recorded: ${sector}/${channel} = +${amount}`);
  }

  getHeatmap(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [sector, channelMap] of this.heatmap) {
      result[sector] = {};
      for (const [channel, revenue] of channelMap) {
        result[sector][channel] = revenue;
      }
    }
    return result;
  }

  getTopSector(): string {
    let top = '';
    let topRev = -1;
    for (const [sector, rev] of this.sectorRevenue) {
      if (rev > topRev) { topRev = rev; top = sector; }
    }
    return top;
  }

  getTopChannel(): string {
    let top = '';
    let topRev = -1;
    for (const [channel, rev] of this.channelRevenue) {
      if (rev > topRev) { topRev = rev; top = channel; }
    }
    return top;
  }

  getStats() {
    const totalSectorRev = Array.from(this.sectorRevenue.values()).reduce((s, v) => s + v, 0);
    const totalChannelRev = Array.from(this.channelRevenue.values()).reduce((s, v) => s + v, 0);
    return {
      sectors: this.sectors.length,
      channels: this.channels.length,
      totalSectorRevenue: totalSectorRev,
      totalChannelRevenue: totalChannelRev,
      topSector: this.getTopSector(),
      topChannel: this.getTopChannel(),
    };
  }

  getStatus() {
    return { sectors: this.sectors.length, channels: this.channels.length };
  }
}
