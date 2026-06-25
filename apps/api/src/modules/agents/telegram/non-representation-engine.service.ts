import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NonRepresentationEngineService {
  private readonly logger = new Logger(NonRepresentationEngineService.name);
  private behavioralChanges: Array<{ delta: number; timestamp: Date }> = [];

  recordChange(delta: number): void {
    this.behavioralChanges.push({ delta, timestamp: new Date() });
  }

  getTotalEffect(): number {
    return this.behavioralChanges.reduce((sum, c) => sum + c.delta, 0);
  }

  getChangeRate(): number {
    if (this.behavioralChanges.length < 2) return 0;
    const recent = this.behavioralChanges.slice(-10);
    return recent.reduce((sum, c) => sum + c.delta, 0) / recent.length;
  }

  getStats() {
    return { totalChanges: this.behavioralChanges.length, totalEffect: this.getTotalEffect(), changeRate: this.getChangeRate() };
  }
}
