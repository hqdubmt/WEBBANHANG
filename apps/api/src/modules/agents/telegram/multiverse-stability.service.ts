import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MultiverseStabilityService {
  private readonly logger = new Logger(MultiverseStabilityService.name);
  private totalRevenue: number = 0;
  private universeDependency: Map<string, number> = new Map();

  updateRevenue(universeId: string, revenue: number): void {
    const previous = this.universeDependency.get(universeId) ?? 0;
    this.totalRevenue = Math.max(0, this.totalRevenue - previous + revenue);
    this.universeDependency.set(universeId, revenue);

    if (this.totalRevenue > 0) {
      for (const [id, rev] of this.universeDependency) {
        this.universeDependency.set(id, rev);
      }
    }
    this.logger.log(`Revenue updated: ${universeId}=${revenue}, total=${this.totalRevenue}`);
  }

  detectSinglePointOfFailure(): string | null {
    if (this.totalRevenue === 0) return null;
    for (const [id, rev] of this.universeDependency) {
      const share = rev / this.totalRevenue;
      if (share > 0.5) {
        this.logger.warn(`Single point of failure detected: ${id} (${(share * 100).toFixed(1)}%)`);
        return id;
      }
    }
    return null;
  }

  stabilize(
    universeRevenues: Record<string, number>,
  ): { rebalanced: boolean; changes: Record<string, number> } {
    const total = Object.values(universeRevenues).reduce((s, v) => s + v, 0);
    if (total === 0) return { rebalanced: false, changes: {} };

    const ids = Object.keys(universeRevenues);
    const evenShare = total / ids.length;
    const changes: Record<string, number> = {};
    let rebalanced = false;

    for (const id of ids) {
      const current = universeRevenues[id];
      const share = current / total;
      if (share > 0.4) {
        const transfer = current - evenShare * 1.2;
        changes[id] = -transfer;
        rebalanced = true;
        this.logger.log(`Rebalancing ${id}: reducing by ${transfer.toFixed(1)}`);
      }
    }

    return { rebalanced, changes };
  }

  getDependencyMap(): Record<string, number> {
    if (this.totalRevenue === 0) return {};
    const result: Record<string, number> = {};
    for (const [id, rev] of this.universeDependency) {
      result[id] = rev / this.totalRevenue;
    }
    return result;
  }

  getStats() {
    return {
      totalRevenue: this.totalRevenue,
      universeCount: this.universeDependency.size,
      spof: this.detectSinglePointOfFailure(),
      dependencyMap: this.getDependencyMap(),
    };
  }
}
