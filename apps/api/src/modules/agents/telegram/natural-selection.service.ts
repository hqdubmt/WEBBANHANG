import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

export interface Selection {
  kept: string[];
  killed: string[];
  cloned: string[];
  mutated: string[];
}

@Injectable()
export class NaturalSelectionService {
  private readonly logger = new Logger(NaturalSelectionService.name);

  selectionHistory: Selection[] = [];

  select(instances: Array<{ id: string; score: number }>): Selection {
    if (instances.length === 0) {
      const empty: Selection = { kept: [], killed: [], cloned: [], mutated: [] };
      this.selectionHistory.push(empty);
      return empty;
    }

    const sorted = [...instances].sort((a, b) => b.score - a.score);
    const n = sorted.length;

    const topCount = Math.ceil(n * 0.2);
    const keepCount = Math.ceil(n * 0.5);
    const killCount = Math.ceil(n * 0.2);

    const top = sorted.slice(0, topCount).map(i => i.id);
    const kept = sorted.slice(0, keepCount).map(i => i.id);
    const killed = sorted.slice(n - killCount).map(i => i.id);
    const middle = sorted
      .slice(topCount, n - killCount)
      .map(i => i.id);

    const selection: Selection = {
      kept,
      killed,
      cloned: top,
      mutated: middle,
    };

    this.selectionHistory.push(selection);
    this.logger.log(
      `Selection: kept=${kept.length}, killed=${killed.length}, cloned=${top.length}, mutated=${middle.length}`,
    );
    return selection;
  }

  @Cron('0 0 * * *')
  dailySelection() {
    this.logger.log('Daily natural selection cycle triggered');
    // Runs against whatever is registered externally; records an empty cycle marker
    const marker: Selection = { kept: [], killed: [], cloned: [], mutated: [] };
    this.selectionHistory.push(marker);
  }

  getStats() {
    const last = this.selectionHistory.at(-1);
    return {
      totalCycles: this.selectionHistory.length,
      lastKept: last?.kept.length ?? 0,
      lastKilled: last?.killed.length ?? 0,
      lastCloned: last?.cloned.length ?? 0,
      lastMutated: last?.mutated.length ?? 0,
    };
  }
}
