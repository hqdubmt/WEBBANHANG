import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SilentImpactService {
  private readonly logger = new Logger(SilentImpactService.name);
  private impacts: Array<{ value: number; realizedAt: Date }> = [];

  createImpact(value: number): void {
    this.impacts.push({ value, realizedAt: new Date() });
  }

  getTotalImpact(): number {
    return this.impacts.reduce((sum, i) => sum + i.value, 0);
  }

  getRecentImpact(sinceMs: number): number {
    const since = Date.now() - sinceMs;
    return this.impacts.filter(i => i.realizedAt.getTime() > since).reduce((sum, i) => sum + i.value, 0);
  }

  applyToRevenue(base: number): number {
    const silent = this.getTotalImpact() * 0.01;
    return base + silent;
  }

  getStats() { return { totalImpacts: this.impacts.length, totalValue: this.getTotalImpact(), recentHour: this.getRecentImpact(3600000) }; }
}
