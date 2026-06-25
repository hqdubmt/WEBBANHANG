import { Injectable, Logger } from '@nestjs/common';

export interface CivMerger { id1: string; id2: string; mergedId: string; mergedAt: Date; revenueGain: number; }

@Injectable()
export class CivilizationMergerService {
  private readonly logger = new Logger(CivilizationMergerService.name);
  private mergers: CivMerger[] = [];
  private eliminated: string[] = [];

  merge(civ1: string, civ2: string): string {
    const mergedId = `merged_${civ1}_${civ2}_${Date.now()}`;
    const gain = Math.random() * 50 + 10;
    this.mergers.push({ id1: civ1, id2: civ2, mergedId, mergedAt: new Date(), revenueGain: gain });
    this.logger.log(`Merged civilizations ${civ1} + ${civ2} → ${mergedId} (gain: ${gain.toFixed(1)})`);
    return mergedId;
  }

  eliminateWeakCiv(civId: string): void {
    this.eliminated.push(civId);
    this.logger.log(`Eliminated weak civilization: ${civId}`);
  }

  getMergerHistory(): CivMerger[] {
    return [...this.mergers];
  }

  getStats() {
    return { totalMergers: this.mergers.length, eliminated: this.eliminated.length, lastMerger: this.mergers[this.mergers.length - 1] };
  }
}
