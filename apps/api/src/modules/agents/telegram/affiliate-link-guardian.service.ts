import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface DeadLinkRecord {
  productId: string;
  url: string;
  detectedAt: number;
}

@Injectable()
export class AffiliateLinkGuardianService {
  private readonly logger = new Logger(AffiliateLinkGuardianService.name);

  private linkStatus: Map<string, 'OK' | 'DEAD' | 'REDIRECT_ERROR' | 'TRACKING_LOST'> = new Map();
  private deadLinks: DeadLinkRecord[] = [];
  private fallbackLinks: Map<string, string> = new Map();
  private checksRun = 0;

  checkLink(url: string, productId: string): 'OK' | 'DEAD' | 'REDIRECT_ERROR' {
    this.checksRun++;
    // Simulate link checking with deterministic heuristic
    if (!url || url.length < 10) {
      this.linkStatus.set(productId, 'DEAD');
      return 'DEAD';
    }
    if (url.includes('redirect_error') || url.includes('broken')) {
      this.linkStatus.set(productId, 'REDIRECT_ERROR');
      return 'REDIRECT_ERROR';
    }
    this.linkStatus.set(productId, 'OK');
    return 'OK';
  }

  getFallbackLink(productId: string): string {
    if (this.fallbackLinks.has(productId)) return this.fallbackLinks.get(productId)!;
    const fallback = `https://fallback.affiliate.vn/product/${productId}?ref=backup`;
    this.fallbackLinks.set(productId, fallback);
    return fallback;
  }

  recordDead(productId: string, url: string): void {
    this.linkStatus.set(productId, 'DEAD');
    const alreadyRecorded = this.deadLinks.some(d => d.productId === productId && d.url === url);
    if (!alreadyRecorded) {
      this.deadLinks.push({ productId, url, detectedAt: Date.now() });
      this.logger.warn(`Dead link recorded for product ${productId}: ${url}`);
    }
  }

  getDeadLinks(): DeadLinkRecord[] {
    return [...this.deadLinks];
  }

  @Cron('0 */2 * * *')
  guardLoop(): void {
    const deadCount = [...this.linkStatus.values()].filter(s => s === 'DEAD' || s === 'REDIRECT_ERROR').length;
    this.logger.log(`Link guard check: ${this.linkStatus.size} tracked, ${deadCount} problematic`);
  }

  getStats() {
    const statusSummary: Record<string, number> = { OK: 0, DEAD: 0, REDIRECT_ERROR: 0, TRACKING_LOST: 0 };
    for (const status of this.linkStatus.values()) statusSummary[status] = (statusSummary[status] ?? 0) + 1;
    return {
      totalTracked: this.linkStatus.size,
      statusSummary,
      deadLinkCount: this.deadLinks.length,
      checksRun: this.checksRun,
    };
  }

  getStatus() {
    return this.getStats();
  }
}
