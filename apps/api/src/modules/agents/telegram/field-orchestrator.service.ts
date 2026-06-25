import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface OrchestrationState {
  attention: number;
  intent: number;
  value: number;
  probability: number;
}

interface OrchestrationLogEntry {
  state: OrchestrationState;
  timestamp: Date;
}

@Injectable()
export class FieldOrchestratorService {
  private readonly logger = new Logger(FieldOrchestratorService.name);

  private orchestratedFields: OrchestrationState = {
    attention: 0,
    intent: 0,
    value: 0,
    probability: 0,
  };

  private orchestrationLog: OrchestrationLogEntry[] = [];

  syncFields(a: number, i: number, v: number, p: number): void {
    this.orchestratedFields = {
      attention: Math.min(1, Math.max(0, a)),
      intent: Math.min(1, Math.max(0, i)),
      value: Math.min(1, Math.max(0, v)),
      probability: Math.min(1, Math.max(0, p)),
    };
    this.logger.debug(`Fields synced: ${JSON.stringify(this.orchestratedFields)}`);
  }

  harmonize(): void {
    const vals = Object.values(this.orchestratedFields);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    this.orchestratedFields = {
      attention: parseFloat(lerp(this.orchestratedFields.attention, mean, 0.3).toFixed(4)),
      intent: parseFloat(lerp(this.orchestratedFields.intent, mean, 0.3).toFixed(4)),
      value: parseFloat(lerp(this.orchestratedFields.value, mean, 0.3).toFixed(4)),
      probability: parseFloat(lerp(this.orchestratedFields.probability, mean, 0.3).toFixed(4)),
    };
    this.logger.debug(`Fields harmonized toward mean=${mean.toFixed(4)}`);
  }

  getFieldState(): OrchestrationState {
    return { ...this.orchestratedFields };
  }

  @Cron('0 */15 * * * *')
  orchestrateLoop(): void {
    this.harmonize();
    this.orchestrationLog.push({ state: { ...this.orchestratedFields }, timestamp: new Date() });
    if (this.orchestrationLog.length > 200) this.orchestrationLog.shift();
    this.logger.log(`Orchestration loop complete — state: ${JSON.stringify(this.orchestratedFields)}`);
  }

  getStats() {
    return {
      currentState: this.orchestratedFields,
      logEntries: this.orchestrationLog.length,
      lastOrchestration: this.orchestrationLog.at(-1)?.timestamp ?? null,
    };
  }
}
