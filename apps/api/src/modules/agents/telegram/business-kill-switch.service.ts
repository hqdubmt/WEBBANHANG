import { Injectable, Logger } from '@nestjs/common';

interface KilledEntry {
  modelId: string;
  reason: string;
  killedAt: Date;
}

@Injectable()
export class BusinessKillSwitchService {
  private readonly logger = new Logger(BusinessKillSwitchService.name);

  killed: Map<string, KilledEntry> = new Map();

  killModel(modelId: string, reason: string): void {
    const entry: KilledEntry = { modelId, reason, killedAt: new Date() };
    this.killed.set(modelId, entry);
    this.logger.warn(`KILL SWITCH activated for ${modelId}: ${reason}`);
  }

  isKilled(modelId: string): boolean {
    return this.killed.has(modelId);
  }

  reviveModel(modelId: string): void {
    if (this.killed.has(modelId)) {
      this.killed.delete(modelId);
      this.logger.log(`Revived model: ${modelId}`);
    }
  }

  getKilledModels(): KilledEntry[] {
    return Array.from(this.killed.values());
  }

  getStats() {
    const killedList = this.getKilledModels();
    return {
      totalKilled: killedList.length,
      killedModels: killedList.map(k => k.modelId),
      reasons: killedList.map(k => ({ model: k.modelId, reason: k.reason })),
    };
  }

  getStatus() {
    return { killedCount: this.killed.size };
  }
}
