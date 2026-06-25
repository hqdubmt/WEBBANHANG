import { Injectable, Logger } from '@nestjs/common';

export interface Arbitration { systems: string[]; winner: string; reason: string; timestamp: Date; }

@Injectable()
export class PriorityArbiterService {
  private readonly logger = new Logger(PriorityArbiterService.name);
  private arbitrations: Arbitration[] = [];

  arbitrate(systems: string[], scores: Record<string, number>): string {
    const winner = systems.reduce((best, s) => (scores[s] || 0) > (scores[best] || 0) ? s : best, systems[0]);
    const reason = `highest score: ${scores[winner]?.toFixed(2) || 0}`;
    this.arbitrations.push({ systems, winner, reason, timestamp: new Date() });
    this.logger.log(`Arbitrated winner: ${winner} (${reason})`);
    return winner;
  }

  shouldExist(systemId: string, score: number, threshold: number): boolean { return score >= threshold; }

  shouldReplicate(systemId: string, score: number, avgScore: number): boolean { return score > avgScore * 1.3; }

  getHistory(): Arbitration[] { return [...this.arbitrations]; }

  getStats() { return { total: this.arbitrations.length, lastWinner: this.arbitrations[this.arbitrations.length - 1]?.winner }; }
}
