import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

type DecisionAction = 'clone' | 'kill' | 'merge';

interface Decision {
  action: DecisionAction;
  instanceId: string;
  timestamp: Date;
  reason: string;
}

@Injectable()
export class ReplicationMetaControllerService {
  private readonly logger = new Logger(ReplicationMetaControllerService.name);

  decisions: Decision[] = [];

  decideClone(instanceId: string, reason: string): void {
    this.decisions.push({ action: 'clone', instanceId, timestamp: new Date(), reason });
    this.logger.log(`CLONE decision: ${instanceId} — ${reason}`);
  }

  decideKill(instanceId: string, reason: string): void {
    this.decisions.push({ action: 'kill', instanceId, timestamp: new Date(), reason });
    this.logger.log(`KILL decision: ${instanceId} — ${reason}`);
  }

  decideMerge(id1: string, id2: string, reason: string): void {
    const label = `${id1}+${id2}`;
    this.decisions.push({ action: 'merge', instanceId: label, timestamp: new Date(), reason });
    this.logger.log(`MERGE decision: ${label} — ${reason}`);
  }

  getDecisions(): Decision[] {
    return this.decisions;
  }

  @Cron('0 4 * * *')
  controlLoop() {
    this.logger.log('ReplicationMetaController control loop triggered');
    const recentClones = this.decisions.filter(
      d => d.action === 'clone' && Date.now() - d.timestamp.getTime() < 86_400_000,
    ).length;
    const recentKills = this.decisions.filter(
      d => d.action === 'kill' && Date.now() - d.timestamp.getTime() < 86_400_000,
    ).length;
    this.logger.log(`24h summary: clones=${recentClones}, kills=${recentKills}`);
  }

  getStats() {
    const counts: Record<DecisionAction, number> = { clone: 0, kill: 0, merge: 0 };
    for (const d of this.decisions) counts[d.action]++;
    return { total: this.decisions.length, ...counts };
  }
}
