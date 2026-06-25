import { Injectable, Logger } from '@nestjs/common';
import { ContentTestEngineService } from './content-test-engine.service';

export interface AutoKillEntry {
  productId: string;
  productName: string;
  score: number;
  reason: string;
  killedAt: Date;
}

@Injectable()
export class AutoKillService {
  private readonly logger = new Logger(AutoKillService.name);
  private readonly killed = new Map<string, AutoKillEntry>();

  constructor(private readonly testEngine: ContentTestEngineService) {}

  // Sync danh sách LOSE từ ContentTestEngine → kill hết
  syncFromTestEngine(): { newKills: number } {
    let newKills = 0;

    for (const entry of this.testEngine.getLosers()) {
      if (this.killed.has(entry.productId)) continue;

      this.killed.set(entry.productId, {
        productId: entry.productId,
        productName: entry.productName,
        score: entry.score,
        reason: `Score ${entry.score}/100 < 50 — TikTok AI layer STOP`,
        killedAt: new Date(),
      });
      newKills++;
      this.logger.log(`Auto Kill: [${entry.productName.slice(0, 40)}] score=${entry.score}`);
    }

    return { newKills };
  }

  isKilled(productId: string): boolean {
    return this.killed.has(productId);
  }

  // Phục hồi sản phẩm — xóa khỏi kill list
  revive(productId: string): boolean {
    const deleted = this.killed.delete(productId);
    if (deleted) {
      this.logger.log(`Auto Kill revived: ${productId}`);
    }
    return deleted;
  }

  getKilled(): AutoKillEntry[] {
    return Array.from(this.killed.values())
      .sort((a, b) => b.killedAt.getTime() - a.killedAt.getTime());
  }

  getStats(): { totalKilled: number; entries: AutoKillEntry[] } {
    return {
      totalKilled: this.killed.size,
      entries: this.getKilled().slice(0, 20),
    };
  }
}
