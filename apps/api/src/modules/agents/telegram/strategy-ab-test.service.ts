import { Injectable, Logger } from '@nestjs/common';

interface AbTest {
  id: string;
  strategies: string[];
  results: Record<string, number>;
  startedAt: number;
  winner?: string;
}

@Injectable()
export class StrategyAbTestService {
  private readonly logger = new Logger(StrategyAbTestService.name);

  private tests: Map<string, AbTest> = new Map();

  startTest(testId: string, strategies: string[]): void {
    if (this.tests.has(testId)) {
      this.logger.warn(`Test already exists: ${testId}`);
      return;
    }
    const results: Record<string, number> = {};
    for (const s of strategies) results[s] = 0;
    this.tests.set(testId, { id: testId, strategies, results, startedAt: Date.now() });
    this.logger.log(`AB test started: ${testId} with strategies: ${strategies.join(', ')}`);
  }

  recordResult(testId: string, strategyId: string, revenue: number): void {
    const test = this.tests.get(testId);
    if (!test) return;
    test.results[strategyId] = (test.results[strategyId] ?? 0) + revenue;
  }

  pickWinner(testId: string): string {
    const test = this.tests.get(testId);
    if (!test) return 'unknown';
    let winner = '';
    let maxRev = -Infinity;
    for (const [id, rev] of Object.entries(test.results)) {
      if (rev > maxRev) { maxRev = rev; winner = id; }
    }
    test.winner = winner;
    this.logger.log(`AB test ${testId} winner: ${winner} (revenue: ${maxRev})`);
    return winner;
  }

  getActiveTests(): AbTest[] {
    return [...this.tests.values()].filter(t => !t.winner);
  }

  getStats() {
    const tests = [...this.tests.values()];
    return {
      totalTests: tests.length,
      activeTests: tests.filter(t => !t.winner).length,
      completedTests: tests.filter(t => !!t.winner).length,
      winners: tests.filter(t => t.winner).map(t => ({ id: t.id, winner: t.winner })),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
