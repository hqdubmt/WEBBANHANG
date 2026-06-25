import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class ContentIntegrityService {
  private readonly logger = new Logger(ContentIntegrityService.name);

  private duplicateHashes: Set<string> = new Set();
  private totalChecked = 0;
  private totalFailed = 0;
  private totalDuplicates = 0;

  private hash(content: string): string {
    return createHash('md5').update(content.trim().toLowerCase()).digest('hex');
  }

  checkContent(content: string): { valid: boolean; issues: string[] } {
    this.totalChecked++;
    const issues: string[] = [];

    if (!content || content.trim().length < 20) {
      issues.push('Content too short');
    }

    const ctaPatterns = ['mua ngay', 'xem ngay', 'click', 'đặt hàng', 'order now', 'buy now', 'get now', 'shop now'];
    const hasCta = ctaPatterns.some(p => content.toLowerCase().includes(p));
    if (!hasCta) issues.push('Missing CTA');

    const affiliatePattern = /https?:\/\/.*(affiliate|ref=|aff_|track|click\.|go\.)/i;
    if (!affiliatePattern.test(content)) issues.push('Missing affiliate link pattern');

    const h = this.hash(content);
    if (this.duplicateHashes.has(h)) {
      issues.push('Duplicate content');
      this.totalDuplicates++;
    }

    const lines = content.split('\n');
    if (lines.length < 2) issues.push('Format: too compact, consider multi-line');

    if (issues.length > 0) {
      this.totalFailed++;
      this.logger.warn(`Content check failed: ${issues.join(', ')}`);
    }

    return { valid: issues.length === 0, issues };
  }

  markPublished(content: string): void {
    const h = this.hash(content);
    this.duplicateHashes.add(h);
  }

  getStats(): { checked: number; failed: number; duplicates: number } {
    return {
      checked: this.totalChecked,
      failed: this.totalFailed,
      duplicates: this.totalDuplicates,
    };
  }

  getStatus() {
    return {
      ...this.getStats(),
      hashPoolSize: this.duplicateHashes.size,
      passRate: this.totalChecked ? ((this.totalChecked - this.totalFailed) / this.totalChecked) * 100 : 100,
    };
  }
}
