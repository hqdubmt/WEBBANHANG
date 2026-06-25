import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class UimsMetaControllerService {
  private readonly logger = new Logger(UimsMetaControllerService.name);
  readonly controlledSystems = ['empire', 'multiverse', 'civilization', 'reality', 'singularity'];
  private systemPriority: Map<string, number> = new Map(this.controlledSystems.map((s, i) => [s, 5 - i]));
  private commands: Array<{ system: string; command: string; timestamp: Date }> = [];

  setPriority(system: string, priority: number): void { this.systemPriority.set(system, priority); }

  getPriority(system: string): number { return this.systemPriority.get(system) || 0; }

  getTopPriority(): string {
    let top = this.controlledSystems[0];
    let topP = this.getPriority(top);
    for (const s of this.controlledSystems) {
      if (this.getPriority(s) > topP) { top = s; topP = this.getPriority(s); }
    }
    return top;
  }

  issueCommand(system: string, command: string): void {
    this.commands.push({ system, command, timestamp: new Date() });
    this.logger.log(`Command issued to ${system}: ${command}`);
  }

  @Cron('0 6 * * *')
  controlLoop(): void {
    const top = this.getTopPriority();
    this.issueCommand(top, 'optimize');
    this.logger.log(`UIMS control loop: focusing on ${top}`);
  }

  getStats() { return { systems: this.controlledSystems.length, topPriority: this.getTopPriority(), commands: this.commands.length }; }
}
