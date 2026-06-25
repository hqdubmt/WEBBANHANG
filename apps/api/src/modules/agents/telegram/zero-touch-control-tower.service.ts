import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ZeroTouchControlTowerService {
  private readonly logger = new Logger(ZeroTouchControlTowerService.name);

  private apiFailureRate = 0;
  private trafficDrop = 0;
  private ctrDrop = 0;
  private fallbackHistory: Array<{ reason: string; timestamp: number }> = [];
  private lastCheck = 0;

  updateMetrics(apiFailureRate: number, trafficDrop: number, ctrDrop: number): void {
    this.apiFailureRate = apiFailureRate;
    this.trafficDrop = trafficDrop;
    this.ctrDrop = ctrDrop;
  }

  detectIssue(): 'CRITICAL' | 'MEDIUM' | 'LOW' | 'OK' {
    if (this.apiFailureRate > 0.5 || this.trafficDrop > 0.7) return 'CRITICAL';
    if (this.apiFailureRate > 0.2 || this.trafficDrop > 0.4 || this.ctrDrop > 0.3) return 'MEDIUM';
    if (this.apiFailureRate > 0.05 || this.trafficDrop > 0.1 || this.ctrDrop > 0.1) return 'LOW';
    return 'OK';
  }

  triggerFallback(reason: string): void {
    this.fallbackHistory.push({ reason, timestamp: Date.now() });
    if (this.fallbackHistory.length > 100) this.fallbackHistory.shift();
    this.logger.warn(`Fallback triggered: ${reason}`);
  }

  @Cron('0 */5 * * * *')
  monitorLoop(): void {
    this.lastCheck = Date.now();
    const severity = this.detectIssue();
    if (severity === 'CRITICAL') {
      this.triggerFallback(`Auto-detected CRITICAL: api=${this.apiFailureRate} traffic=${this.trafficDrop}`);
    } else if (severity !== 'OK') {
      this.logger.log(`Health check: ${severity}`);
    }
  }

  getStatus() {
    return {
      apiFailureRate: this.apiFailureRate,
      trafficDrop: this.trafficDrop,
      ctrDrop: this.ctrDrop,
      severity: this.detectIssue(),
      lastCheck: this.lastCheck,
      fallbackCount: this.fallbackHistory.length,
      recentFallbacks: this.fallbackHistory.slice(-5),
    };
  }
}
