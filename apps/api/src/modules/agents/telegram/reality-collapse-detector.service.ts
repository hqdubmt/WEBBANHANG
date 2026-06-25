import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RealityCollapseDetectorService {
  private readonly logger = new Logger(RealityCollapseDetectorService.name);
  private revenueHistory: Map<string, number[]> = new Map();

  recordRevenue(realityId: string, revenue: number): void {
    const history = this.revenueHistory.get(realityId) ?? [];
    history.push(revenue);
    // Keep last 10 ticks
    if (history.length > 10) history.shift();
    this.revenueHistory.set(realityId, history);
  }

  detectCollapse(realityId: string): boolean {
    const history = this.revenueHistory.get(realityId) ?? [];
    if (history.length < 3) return false;

    const recent = history.slice(-3);
    const peak = recent[0];
    const latest = recent[recent.length - 1];

    if (peak === 0) return false;
    const decline = (peak - latest) / peak;
    return decline > 0.3;
  }

  detectSaturation(realityId: string): boolean {
    const history = this.revenueHistory.get(realityId) ?? [];
    if (history.length < 5) return false;

    const recent = history.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];

    if (first === 0) return false;
    const growth = (last - first) / first;
    return growth < 0.01;
  }

  getAtRiskRealities(): string[] {
    return Array.from(this.revenueHistory.keys()).filter(
      id => this.detectCollapse(id) || this.detectSaturation(id),
    );
  }

  @Cron('0 */4 * * *')
  collapseMonitor(): void {
    const atRisk = this.getAtRiskRealities();
    this.logger.log(`Collapse monitor: ${atRisk.length} at-risk realities: [${atRisk.join(', ')}]`);
    for (const id of atRisk) {
      const collapsed = this.detectCollapse(id);
      const saturated = this.detectSaturation(id);
      this.logger.warn(`Reality ${id} — collapse=${collapsed} saturation=${saturated}`);
    }
  }

  getStats() {
    return {
      trackedRealities: this.revenueHistory.size,
      collapsed: Array.from(this.revenueHistory.keys()).filter(id => this.detectCollapse(id)).length,
      saturated: Array.from(this.revenueHistory.keys()).filter(id => this.detectSaturation(id)).length,
      atRisk: this.getAtRiskRealities().length,
    };
  }
}
