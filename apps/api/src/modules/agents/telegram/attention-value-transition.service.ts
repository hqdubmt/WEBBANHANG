import { Injectable, Logger } from '@nestjs/common';

type AwarenessState = 'unaware' | 'aware' | 'interested' | 'desiring' | 'buying';

interface Transition {
  fromState: AwarenessState;
  toState: string;
  probability: number;
}

interface TransitionLog {
  from: string;
  to: string;
  timestamp: Date;
}

@Injectable()
export class AttentionValueTransitionService {
  private readonly logger = new Logger(AttentionValueTransitionService.name);

  private transitionMatrix: Transition[] = [
    { fromState: 'unaware', toState: 'aware', probability: 0.3 },
    { fromState: 'aware', toState: 'interested', probability: 0.4 },
    { fromState: 'interested', toState: 'desiring', probability: 0.35 },
    { fromState: 'desiring', toState: 'buying', probability: 0.25 },
  ];

  private transitionLog: TransitionLog[] = [];

  recordTransition(from: string, to: string): void {
    this.transitionLog.push({ from, to, timestamp: new Date() });
    if (this.transitionLog.length > 1000) this.transitionLog.shift();

    // Update probability from empirical observation
    const entry = this.transitionMatrix.find(
      (t) => t.fromState === from && t.toState === to,
    );
    if (entry) {
      const totalFrom = this.transitionLog.filter((l) => l.from === from).length;
      const totalTo = this.transitionLog.filter((l) => l.from === from && l.to === to).length;
      entry.probability = parseFloat((totalTo / totalFrom).toFixed(4));
    }
    this.logger.debug(`Transition recorded: ${from} → ${to}`);
  }

  getTransitionProbability(from: string, to: string): number {
    const entry = this.transitionMatrix.find(
      (t) => t.fromState === from && t.toState === to,
    );
    return entry?.probability ?? 0;
  }

  optimizeTransition(from: string, to: string, boost: number): void {
    const entry = this.transitionMatrix.find(
      (t) => t.fromState === from && t.toState === to,
    );
    if (entry) {
      entry.probability = Math.min(1, entry.probability + boost);
    } else {
      this.transitionMatrix.push({ fromState: from as AwarenessState, toState: to, probability: Math.min(1, boost) });
    }
    this.logger.debug(`Transition optimized: ${from} → ${to} (+${boost})`);
  }

  getStats() {
    return {
      matrixSize: this.transitionMatrix.length,
      logSize: this.transitionLog.length,
      matrix: this.transitionMatrix,
      recentTransitions: this.transitionLog.slice(-10),
    };
  }
}
