import { Injectable, Logger } from '@nestjs/common';

export interface MetaSystem { id: string; architecture: Record<string, any>; built: boolean; revenuePotential: number; createdAt: Date; }

@Injectable()
export class MetaSystemConstructorService {
  private readonly logger = new Logger(MetaSystemConstructorService.name);
  private systems: Map<string, MetaSystem> = new Map();
  private counter: number = 0;

  construct(architecture: Record<string, any>): MetaSystem {
    const id = `meta_sys_${++this.counter}`;
    const potential = Object.keys(architecture).length * 10 + Math.random() * 50;
    const system: MetaSystem = { id, architecture, built: true, revenuePotential: potential, createdAt: new Date() };
    this.systems.set(id, system);
    this.logger.log(`Meta-system constructed: ${id} (potential: ${potential.toFixed(1)})`);
    return system;
  }

  rebuild(id: string, newArch: Record<string, any>): MetaSystem {
    const existing = this.systems.get(id);
    if (!existing) return this.construct(newArch);
    existing.architecture = newArch;
    existing.revenuePotential = Object.keys(newArch).length * 10 + Math.random() * 50;
    return existing;
  }

  getAll(): MetaSystem[] { return Array.from(this.systems.values()); }

  getStats() { return { total: this.systems.size, avgPotential: this.getAll().reduce((s, m) => s + m.revenuePotential, 0) / (this.systems.size || 1) }; }
}
