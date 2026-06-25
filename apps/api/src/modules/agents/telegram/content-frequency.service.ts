import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContentFrequencyService {
  private readonly logger = new Logger(ContentFrequencyService.name);

  postsPerHour = 2;
  productsPerBatch = 5;
  repostsPerDay = 3;
  saturationLevel = 0;

  private readonly performanceHistory: number[] = [];
  private readonly windowSize = 20;
  private adjustmentCount = 0;

  recordPerformance(score: number): void {
    this.performanceHistory.push(score);
    if (this.performanceHistory.length > this.windowSize) this.performanceHistory.shift();
    const avg = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    this.saturationLevel = avg < 30 ? Math.min(100, this.saturationLevel + 5) : Math.max(0, this.saturationLevel - 3);
  }

  adjustFrequency(): void {
    const avg = this.performanceHistory.length
      ? this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length
      : 50;

    if (this.saturationLevel > 70) {
      this.postsPerHour = Math.max(1, this.postsPerHour - 1);
      this.productsPerBatch = Math.max(2, this.productsPerBatch - 1);
      this.logger.warn(`High saturation (${this.saturationLevel}%), reducing frequency`);
    } else if (avg > 70 && this.saturationLevel < 30) {
      this.postsPerHour = Math.min(6, this.postsPerHour + 1);
      this.productsPerBatch = Math.min(10, this.productsPerBatch + 1);
      this.logger.log(`Good performance, increasing frequency`);
    }

    if (avg < 20) {
      this.repostsPerDay = Math.max(1, this.repostsPerDay - 1);
    } else if (avg > 60) {
      this.repostsPerDay = Math.min(8, this.repostsPerDay + 1);
    }

    this.adjustmentCount++;
  }

  getSettings() {
    return {
      postsPerHour: this.postsPerHour,
      productsPerBatch: this.productsPerBatch,
      repostsPerDay: this.repostsPerDay,
      saturationLevel: this.saturationLevel,
    };
  }

  getStats() {
    const avg = this.performanceHistory.length
      ? this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length
      : 0;
    return {
      ...this.getSettings(),
      adjustmentCount: this.adjustmentCount,
      averagePerformanceScore: Math.round(avg),
      dataPoints: this.performanceHistory.length,
    };
  }

  getStatus() {
    return this.getStats();
  }
}
