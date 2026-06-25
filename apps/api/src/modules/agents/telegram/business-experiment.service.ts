import { Injectable, Logger } from '@nestjs/common';

export interface Experiment {
  id: string;
  type: 'niche' | 'content' | 'channel' | 'hook';
  params: Record<string, any>;
  startedAt: Date;
  result?: { revenue: number; ctr: number };
  status: 'running' | 'completed' | 'failed';
}

@Injectable()
export class BusinessExperimentService {
  private readonly logger = new Logger(BusinessExperimentService.name);

  experiments: Map<string, Experiment> = new Map();
  private counter = 0;

  startExperiment(type: string, params: Record<string, any>): string {
    const id = `exp-${++this.counter}-${Date.now()}`;
    const validType = (['niche', 'content', 'channel', 'hook'].includes(type) ? type : 'content') as Experiment['type'];
    const exp: Experiment = {
      id,
      type: validType,
      params,
      startedAt: new Date(),
      status: 'running',
    };
    this.experiments.set(id, exp);
    this.logger.log(`Started experiment ${id} (${type})`);
    return id;
  }

  recordResult(id: string, revenue: number, ctr: number): void {
    const exp = this.experiments.get(id);
    if (!exp) return;
    this.experiments.set(id, { ...exp, result: { revenue, ctr } });
  }

  completeExperiment(id: string, success: boolean): void {
    const exp = this.experiments.get(id);
    if (!exp) return;
    this.experiments.set(id, { ...exp, status: success ? 'completed' : 'failed' });
    this.logger.log(`Experiment ${id} ${success ? 'completed' : 'failed'}`);
  }

  getActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values()).filter(e => e.status === 'running');
  }

  getCompletedExperiments(): Experiment[] {
    return Array.from(this.experiments.values()).filter(e => e.status === 'completed');
  }

  getStats() {
    const all = Array.from(this.experiments.values());
    const running = all.filter(e => e.status === 'running').length;
    const completed = all.filter(e => e.status === 'completed');
    const failed = all.filter(e => e.status === 'failed').length;
    const avgRevenue = completed.length
      ? completed.reduce((s, e) => s + (e.result?.revenue ?? 0), 0) / completed.length
      : 0;
    return {
      total: all.length,
      running,
      completed: completed.length,
      failed,
      avgRevenue: +avgRevenue.toFixed(2),
    };
  }

  getStatus() {
    return { active: this.getActiveExperiments().length, total: this.experiments.size };
  }
}
