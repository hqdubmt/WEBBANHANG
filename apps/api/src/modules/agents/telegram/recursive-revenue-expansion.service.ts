import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RecursiveRevenueExpansionService {
  private readonly logger = new Logger(RecursiveRevenueExpansionService.name);
  private level: number = 0;
  private baseRevenue: number = 0;
  private multiplier: number = 1.1;
  private expansionLog: Array<{ level: number; revenue: number; timestamp: Date }> = [];

  expandRevenue(currentRevenue: number): number {
    this.baseRevenue = currentRevenue;
    const expanded = currentRevenue * Math.pow(this.multiplier, this.level + 1);
    this.expansionLog.push({ level: this.level, revenue: expanded, timestamp: new Date() });
    return expanded;
  }

  expandCapacity(): void {
    this.multiplier = Math.min(2.0, this.multiplier + 0.05);
    this.level++;
    this.logger.log(`Revenue capacity expanded: level=${this.level}, multiplier=${this.multiplier}`);
  }

  @Cron('0 */12 * * *')
  expansionCycle(): void {
    this.expandCapacity();
    const projected = this.expandRevenue(this.baseRevenue || 100);
    this.logger.log(`Expansion cycle: projected revenue = ${projected.toFixed(2)}`);
  }

  getStats() {
    return { level: this.level, multiplier: this.multiplier, baseRevenue: this.baseRevenue, expansions: this.expansionLog.length };
  }
}
