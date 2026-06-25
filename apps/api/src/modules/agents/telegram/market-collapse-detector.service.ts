import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class MarketCollapseDetectorService {
  private readonly logger = new Logger(MarketCollapseDetectorService.name);

  trends: Map<string, number[]> = new Map([
    ['affiliate', [5000, 5200, 5100, 4800, 4900]],
    ['content', [3000, 2900, 2800, 2700, 2600]],
    ['ads', [2500, 2400, 1800, 1600, 1500]],
    ['flashdeal', [7000, 7500, 8000, 8200, 8500]],
  ]);

  private readonly WINDOW = 10;

  recordTrend(sector: string, revenue: number): void {
    if (!this.trends.has(sector)) this.trends.set(sector, []);
    const history = this.trends.get(sector)!;
    history.push(revenue);
    if (history.length > this.WINDOW) history.shift();
  }

  detectCollapse(sector: string): boolean {
    const history = this.trends.get(sector);
    if (!history || history.length < 2) return false;
    const peak = Math.max(...history);
    const latest = history[history.length - 1];
    return latest < peak * 0.70;
  }

  detectSaturation(sector: string): boolean {
    const history = this.trends.get(sector);
    if (!history || history.length < 4) return false;
    const last4 = history.slice(-4);
    const max = Math.max(...last4);
    const min = Math.min(...last4);
    return (max - min) / (max || 1) < 0.05;
  }

  getCollapseReport(): Record<string, boolean> {
    const report: Record<string, boolean> = {};
    for (const [sector] of this.trends) {
      report[sector] = this.detectCollapse(sector);
    }
    return report;
  }

  getSaturationReport(): Record<string, boolean> {
    const report: Record<string, boolean> = {};
    for (const [sector] of this.trends) {
      report[sector] = this.detectSaturation(sector);
    }
    return report;
  }

  @Cron('0 */4 * * *')
  collapseCheck(): void {
    this.logger.log('[CollapseDetector] Running periodic collapse check');
    for (const [sector] of this.trends) {
      const collapsed = this.detectCollapse(sector);
      const saturated = this.detectSaturation(sector);
      if (collapsed) this.logger.warn(`COLLAPSE DETECTED: ${sector}`);
      if (saturated) this.logger.warn(`SATURATION DETECTED: ${sector}`);
    }
  }

  getStats() {
    const collapseReport = this.getCollapseReport();
    const saturationReport = this.getSaturationReport();
    return {
      trackedSectors: this.trends.size,
      collapsed: Object.entries(collapseReport).filter(([, v]) => v).map(([k]) => k),
      saturated: Object.entries(saturationReport).filter(([, v]) => v).map(([k]) => k),
    };
  }

  getStatus() {
    return { sectors: this.trends.size };
  }
}
