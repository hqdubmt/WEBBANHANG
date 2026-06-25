import { Injectable, Logger } from '@nestjs/common';

type FailureType = 'api' | 'traffic' | 'ctr' | 'link' | 'content';

@Injectable()
export class SystemHealthMonitorService {
  private readonly logger = new Logger(SystemHealthMonitorService.name);

  private metrics: Record<FailureType, number> = {
    api: 0,
    traffic: 0,
    ctr: 0,
    link: 0,
    content: 0,
  };

  private thresholds: Record<FailureType, number> = {
    api: 10,
    traffic: 5,
    ctr: 8,
    link: 3,
    content: 6,
  };

  private alerts: string[] = [];
  private totalChecks = 0;

  recordFailure(type: FailureType): void {
    this.metrics[type]++;
    this.totalChecks++;
    if (this.metrics[type] >= this.thresholds[type]) {
      const alert = `[${new Date().toISOString()}] ALERT: ${type} failure rate exceeded threshold (${this.metrics[type]})`;
      this.alerts.push(alert);
      if (this.alerts.length > 50) this.alerts.shift();
      this.logger.warn(alert);
    }
  }

  recordRecovery(type: string): void {
    if (type in this.metrics) {
      const key = type as FailureType;
      this.metrics[key] = Math.max(0, this.metrics[key] - 1);
      this.logger.log(`Recovery recorded for: ${type}`);
    }
  }

  getHealthScore(): number {
    const total = Object.values(this.metrics).reduce((a, b) => a + b, 0);
    const maxPossible = Object.values(this.thresholds).reduce((a, b) => a + b, 0);
    const raw = 1 - total / maxPossible;
    return Math.max(0, Math.min(100, Math.round(raw * 100)));
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  getStats() {
    return {
      metrics: { ...this.metrics },
      healthScore: this.getHealthScore(),
      totalChecks: this.totalChecks,
      alertCount: this.alerts.length,
      recentAlerts: this.alerts.slice(-5),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
