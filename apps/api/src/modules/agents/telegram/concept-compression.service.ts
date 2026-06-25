import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConceptCompressionService {
  private readonly logger = new Logger(ConceptCompressionService.name);
  private compressed = { patterns: [] as string[], rules: [] as string[], invariants: [] as string[], emergentBehaviors: [] as string[] };

  addPattern(p: string): void { if (!this.compressed.patterns.includes(p)) this.compressed.patterns.push(p); }
  addRule(r: string): void { if (!this.compressed.rules.includes(r)) this.compressed.rules.push(r); }
  addInvariant(i: string): void { if (!this.compressed.invariants.includes(i)) this.compressed.invariants.push(i); }
  addEmergentBehavior(b: string): void { if (!this.compressed.emergentBehaviors.includes(b)) this.compressed.emergentBehaviors.push(b); }

  getCompressed(): typeof this.compressed { return { ...this.compressed }; }

  synthesize(): string {
    const total = this.compressed.patterns.length + this.compressed.rules.length + this.compressed.invariants.length + this.compressed.emergentBehaviors.length;
    return `System compressed: ${total} concepts (${this.compressed.patterns.length}P ${this.compressed.rules.length}R ${this.compressed.invariants.length}I ${this.compressed.emergentBehaviors.length}E)`;
  }

  getStats() {
    return { patterns: this.compressed.patterns.length, rules: this.compressed.rules.length, invariants: this.compressed.invariants.length, behaviors: this.compressed.emergentBehaviors.length, summary: this.synthesize() };
  }
}
