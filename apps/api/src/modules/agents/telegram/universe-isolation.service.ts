import { Injectable, Logger } from '@nestjs/common';

interface UniverseState {
  data: Record<string, any>;
  strategy: string;
  contentStyle: string;
  trafficLogic: string;
}

@Injectable()
export class UniverseIsolationService {
  private readonly logger = new Logger(UniverseIsolationService.name);
  private isolated: Map<string, UniverseState> = new Map();

  isolate(universeId: string, state: UniverseState): void {
    this.isolated.set(universeId, { ...state, data: { ...state.data } });
    this.logger.log(`Isolated universe ${universeId} with strategy=${state.strategy}`);
  }

  get(universeId: string): UniverseState | undefined {
    return this.isolated.get(universeId);
  }

  clearIsolation(universeId: string): void {
    if (this.isolated.has(universeId)) {
      this.isolated.delete(universeId);
      this.logger.log(`Cleared isolation for ${universeId}`);
    }
  }

  listIsolated(): string[] {
    return [...this.isolated.keys()];
  }

  updateData(universeId: string, key: string, value: any): void {
    const state = this.isolated.get(universeId);
    if (state) {
      state.data[key] = value;
    }
  }

  getStats() {
    const strategies: Record<string, number> = {};
    for (const s of this.isolated.values()) {
      strategies[s.strategy] = (strategies[s.strategy] ?? 0) + 1;
    }
    return { totalIsolated: this.isolated.size, byStrategy: strategies };
  }
}
