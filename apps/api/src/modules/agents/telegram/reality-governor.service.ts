import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

type CommandType = 'create' | 'destroy' | 'merge' | 'fork';

interface Command {
  type: CommandType;
  realityId: string;
  timestamp: Date;
  reason: string;
}

@Injectable()
export class RealityGovernorService {
  private readonly logger = new Logger(RealityGovernorService.name);
  private commands: Command[] = [];
  private resourceAllocations: Map<string, Record<string, number>> = new Map();

  create(reason: string): void {
    const realityId = uuidv4();
    this.commands.push({ type: 'create', realityId, timestamp: new Date(), reason });
    this.logger.log(`Governor: CREATE reality ${realityId} — ${reason}`);
  }

  destroy(realityId: string, reason: string): void {
    this.commands.push({ type: 'destroy', realityId, timestamp: new Date(), reason });
    this.logger.log(`Governor: DESTROY reality ${realityId} — ${reason}`);
  }

  allocate(realityId: string, resources: Record<string, number>): void {
    const existing = this.resourceAllocations.get(realityId) ?? {};
    this.resourceAllocations.set(realityId, { ...existing, ...resources });
    this.logger.log(`Governor: ALLOCATE to ${realityId} — ${JSON.stringify(resources)}`);
  }

  getCommands(): Command[] {
    return [...this.commands];
  }

  @Cron('0 5 * * *')
  governLoop(): void {
    this.logger.log('Governor: running daily govern loop');
    const totalCommands = this.commands.length;
    const creates = this.commands.filter(c => c.type === 'create').length;
    const destroys = this.commands.filter(c => c.type === 'destroy').length;

    this.logger.log(`Governor stats: total=${totalCommands} creates=${creates} destroys=${destroys}`);

    // Auto-create if no realities active
    if (creates === destroys) {
      this.create('auto-replenish from govern loop');
    }
  }

  getStats() {
    const byType = this.commands.reduce<Record<string, number>>((acc, c) => {
      acc[c.type] = (acc[c.type] ?? 0) + 1;
      return acc;
    }, {});
    return {
      totalCommands: this.commands.length,
      byType,
      allocatedRealities: this.resourceAllocations.size,
    };
  }
}
