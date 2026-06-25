import { Injectable, Logger } from '@nestjs/common';

export interface Lesson {
  fromInstance: string;
  toInstance: string;
  what: string;
  value: any;
  timestamp: Date;
}

@Injectable()
export class CrossInstanceLearningService {
  private readonly logger = new Logger(CrossInstanceLearningService.name);

  lessons: Lesson[] = [];

  private record(fromId: string, toId: string, what: string, value: any): void {
    this.lessons.push({ fromInstance: fromId, toInstance: toId, what, value, timestamp: new Date() });
    this.logger.debug(`Transfer [${what}] from ${fromId} → ${toId}`);
  }

  transferHook(fromId: string, toId: string, hook: string): void {
    this.record(fromId, toId, 'hook', hook);
  }

  transferProduct(fromId: string, toId: string, productId: string): void {
    this.record(fromId, toId, 'product', productId);
  }

  transferChannel(fromId: string, toId: string, channel: string): void {
    this.record(fromId, toId, 'channel', channel);
  }

  getTransfers(instanceId: string): Lesson[] {
    return this.lessons.filter(
      l => l.fromInstance === instanceId || l.toInstance === instanceId,
    );
  }

  getStats() {
    const byType: Record<string, number> = {};
    for (const l of this.lessons) {
      byType[l.what] = (byType[l.what] ?? 0) + 1;
    }
    return {
      totalLessons: this.lessons.length,
      byType,
      activeInstances: new Set([
        ...this.lessons.map(l => l.fromInstance),
        ...this.lessons.map(l => l.toInstance),
      ]).size,
    };
  }
}
