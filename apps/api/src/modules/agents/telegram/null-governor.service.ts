import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

type NullState = 'void' | 'absent' | 'no-data';

@Injectable()
export class NullGovernorService {
  private readonly logger = new Logger(NullGovernorService.name);
  private governedStates: NullState[] = ['void', 'absent', 'no-data'];
  private currentState: NullState = 'void';
  private stateHistory: Array<{ state: NullState; timestamp: Date }> = [];

  govern(): void {
    const idx = Math.floor(Math.random() * this.governedStates.length);
    this.transition(this.governedStates[idx]);
  }

  transition(to: string): void {
    const valid: NullState[] = ['void', 'absent', 'no-data'];
    if (valid.includes(to as NullState)) {
      this.currentState = to as NullState;
      this.stateHistory.push({ state: this.currentState, timestamp: new Date() });
    }
  }

  getGoverned(): NullState[] { return [...this.governedStates]; }

  @Cron('0 */4 * * *')
  governCycle(): void {
    this.govern();
    this.logger.log(`Null governor cycle: state=${this.currentState}`);
  }

  getStats() { return { current: this.currentState, transitions: this.stateHistory.length, history: this.stateHistory.slice(-5) }; }
}
