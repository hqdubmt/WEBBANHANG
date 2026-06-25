import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface CollapseEvent {
  civId: string;
  reason: string;
  timestamp: Date;
}

@Injectable()
export class CivilizationCollapseService {
  private readonly logger = new Logger(CivilizationCollapseService.name);

  collapseRisks: Map<string, number> = new Map();
  collapseHistory: CollapseEvent[] = [];

  updateRisk(civId: string, revenueChange: number, roiChange: number): void {
    const current = this.collapseRisks.get(civId) ?? 0;
    let delta = 0;
    if (revenueChange < 0) delta += Math.abs(revenueChange) * 0.3;
    if (roiChange < 0) delta += Math.abs(roiChange) * 0.5;
    if (revenueChange > 0) delta -= revenueChange * 0.1;
    const newRisk = Math.max(0, Math.min(100, current + delta));
    this.collapseRisks.set(civId, newRisk);
    this.logger.debug(`Risk for ${civId}: ${current.toFixed(1)} → ${newRisk.toFixed(1)}`);
  }

  detectCollapse(civId: string): boolean {
    const risk = this.collapseRisks.get(civId) ?? 0;
    return risk > 70;
  }

  recordCollapse(civId: string, reason: string): void {
    this.collapseHistory.push({ civId, reason, timestamp: new Date() });
    this.collapseRisks.set(civId, 0);
    this.logger.warn(`Collapse recorded for ${civId}: ${reason}`);
  }

  @Cron('0 */3 * * *')
  riskScan() {
    this.logger.log('Collapse risk scan triggered');
    for (const [civId, risk] of this.collapseRisks.entries()) {
      if (risk > 70) {
        this.logger.warn(`High collapse risk: ${civId} = ${risk.toFixed(1)}`);
      }
    }
  }

  getStats() {
    const risks = Array.from(this.collapseRisks.values());
    return {
      tracked: this.collapseRisks.size,
      avgRisk: risks.length ? risks.reduce((s, r) => s + r, 0) / risks.length : 0,
      highRisk: risks.filter(r => r > 70).length,
      totalCollapses: this.collapseHistory.length,
    };
  }
}
