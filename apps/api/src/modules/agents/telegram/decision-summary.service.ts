import { Injectable, Logger } from '@nestjs/common';

export interface DecisionEntry {
  focus: string;
  winningModel: string;
  losers: string[];
  timestamp: Date;
}

@Injectable()
export class DecisionSummaryService {
  private readonly logger = new Logger(DecisionSummaryService.name);

  decisions: DecisionEntry[] = [
    { focus: 'Revenue maximization', winningModel: 'flashdeal', losers: ['review'], timestamp: new Date(Date.now() - 86400000) },
    { focus: 'Stability focus', winningModel: 'affiliate', losers: ['content'], timestamp: new Date(Date.now() - 43200000) },
  ];

  addDecision(focus: string, winner: string, losers: string[]): void {
    const entry: DecisionEntry = { focus, winningModel: winner, losers, timestamp: new Date() };
    this.decisions.push(entry);
    this.logger.log(`Decision recorded: focus=${focus}, winner=${winner}, losers=[${losers.join(',')}]`);
  }

  getLatest(): DecisionEntry | undefined {
    return this.decisions[this.decisions.length - 1];
  }

  generateSummary(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDecisions = this.decisions.filter(d => d.timestamp >= today);
    const latest = this.getLatest();

    const lines = [
      `=== DECISION SUMMARY [${new Date().toISOString().split('T')[0]}] ===`,
      `Today's Decisions: ${todayDecisions.length}`,
      `Current Focus: ${latest?.focus ?? 'None'}`,
      `Winning Model: ${latest?.winningModel ?? 'None'}`,
      `Losers: ${latest?.losers?.join(', ') ?? 'None'}`,
      `Total Historical Decisions: ${this.decisions.length}`,
    ];

    if (todayDecisions.length > 0) {
      lines.push('--- Today\'s Actions ---');
      for (const d of todayDecisions) {
        lines.push(`  [${d.timestamp.toTimeString().slice(0,5)}] ${d.focus}: WIN=${d.winningModel} LOSE=[${d.losers.join(',')}]`);
      }
    }

    return lines.join('\n');
  }

  getHistory(n: number): DecisionEntry[] {
    return this.decisions.slice(-n);
  }

  getStats() {
    const winners: Record<string, number> = {};
    for (const d of this.decisions) {
      winners[d.winningModel] = (winners[d.winningModel] ?? 0) + 1;
    }
    const topWinner = Object.entries(winners).sort((a, b) => b[1] - a[1])[0];
    return {
      totalDecisions: this.decisions.length,
      topWinner: topWinner?.[0] ?? 'none',
      topWins: topWinner?.[1] ?? 0,
      winnerBreakdown: winners,
    };
  }

  getStatus() {
    return { totalDecisions: this.decisions.length, latest: this.getLatest()?.focus };
  }
}
