import { Injectable, Logger } from '@nestjs/common';
import { RevenueDNA } from './revenue-dna-engine.service';

export interface Clone {
  id: string;
  sourceDna: RevenueDNA;
  active: boolean;
  createdAt: Date;
}

@Injectable()
export class SystemClonerService {
  private readonly logger = new Logger(SystemClonerService.name);

  clones: Map<string, Clone> = new Map();

  cloneStrategy(dna: RevenueDNA): string {
    const id = `clone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const clone: Clone = {
      id,
      sourceDna: { ...dna },
      active: true,
      createdAt: new Date(),
    };
    this.clones.set(id, clone);
    this.logger.log(`Cloned strategy → ${id}`);
    return id;
  }

  getClone(id: string): Clone | undefined {
    return this.clones.get(id);
  }

  deactivateClone(id: string): void {
    const clone = this.clones.get(id);
    if (clone) {
      clone.active = false;
      this.logger.log(`Deactivated clone ${id}`);
    }
  }

  getActiveClones(): Clone[] {
    return Array.from(this.clones.values()).filter(c => c.active);
  }

  getStats() {
    const all = Array.from(this.clones.values());
    return {
      total: all.length,
      active: all.filter(c => c.active).length,
      inactive: all.filter(c => !c.active).length,
    };
  }
}
