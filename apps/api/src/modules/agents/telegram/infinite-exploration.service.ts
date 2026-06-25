import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InfiniteExplorationService {
  private readonly logger = new Logger(InfiniteExplorationService.name);
  private explored: Set<string> = new Set();
  private queue: string[] = [];

  exploreStrategy(name: string, params: Record<string, any>): void {
    const key = `strategy:${name}:${JSON.stringify(params)}`;
    if (!this.explored.has(key)) {
      this.explored.add(key);
      this.logger.log(`Exploring strategy: ${name}`);
    }
  }

  exploreChannel(channel: string): void {
    const key = `channel:${channel}`;
    if (!this.explored.has(key)) { this.explored.add(key); this.queue.push(key); }
  }

  exploreContent(contentType: string): void {
    const key = `content:${contentType}`;
    if (!this.explored.has(key)) { this.explored.add(key); this.queue.push(key); }
  }

  getExplored(): string[] { return Array.from(this.explored); }

  getNextExploration(): string | undefined { return this.queue.shift(); }

  getStats() { return { explored: this.explored.size, queued: this.queue.length }; }
}
