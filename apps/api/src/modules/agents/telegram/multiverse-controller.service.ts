import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface Command {
  type: 'scale' | 'kill' | 'clone';
  universeId: string;
  timestamp: Date;
  reason: string;
}

@Injectable()
export class MultiverseControllerService {
  private readonly logger = new Logger(MultiverseControllerService.name);
  private commands: Command[] = [];

  private record(type: Command['type'], universeId: string, reason: string): void {
    this.commands.push({ type, universeId, timestamp: new Date(), reason });
    this.logger.log(`Command [${type}] universe=${universeId} reason=${reason}`);
  }

  scale(universeId: string, reason: string): void {
    this.record('scale', universeId, reason);
  }

  kill(universeId: string, reason: string): void {
    this.record('kill', universeId, reason);
  }

  clone(universeId: string, reason: string): void {
    this.record('clone', universeId, reason);
  }

  getCommands(): Command[] {
    return this.commands;
  }

  getCommandsForUniverse(universeId: string): Command[] {
    return this.commands.filter(c => c.universeId === universeId);
  }

  @Cron('0 3 * * *')
  controlCycle(): void {
    this.logger.log('Control cycle running — evaluating universes');
    // In real deployment this wires into ranking/lifecycle services
    const mockUniverses = ['u-alpha', 'u-beta', 'u-gamma'];
    for (const id of mockUniverses) {
      const rand = Math.random();
      if (rand > 0.8) this.scale(id, 'high revenue growth');
      else if (rand < 0.1) this.kill(id, 'sustained losses');
    }
  }

  getStats() {
    const byType: Record<string, number> = { scale: 0, kill: 0, clone: 0 };
    for (const c of this.commands) byType[c.type]++;
    return { total: this.commands.length, byType };
  }
}
