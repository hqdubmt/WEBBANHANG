import { Injectable, Logger } from '@nestjs/common';

interface Migration {
  fromUniverse: string;
  toUniverse: string;
  type: 'product' | 'strategy' | 'content';
  value: string;
  timestamp: Date;
}

@Injectable()
export class CrossUniverseMigrationService {
  private readonly logger = new Logger(CrossUniverseMigrationService.name);
  private migrations: Migration[] = [];

  private record(from: string, to: string, type: Migration['type'], value: string): void {
    this.migrations.push({ fromUniverse: from, toUniverse: to, type, value, timestamp: new Date() });
    this.logger.log(`Migration ${type}: ${from} -> ${to} [${value}]`);
  }

  migrateProduct(from: string, to: string, productId: string): void {
    this.record(from, to, 'product', productId);
  }

  migrateStrategy(from: string, to: string, strategy: string): void {
    this.record(from, to, 'strategy', strategy);
  }

  migrateContent(from: string, to: string, contentId: string): void {
    this.record(from, to, 'content', contentId);
  }

  getMigrations(universeId: string): Migration[] {
    return this.migrations.filter(
      m => m.fromUniverse === universeId || m.toUniverse === universeId,
    );
  }

  getByType(type: Migration['type']): Migration[] {
    return this.migrations.filter(m => m.type === type);
  }

  getStats() {
    const byType: Record<string, number> = { product: 0, strategy: 0, content: 0 };
    for (const m of this.migrations) byType[m.type]++;
    return { total: this.migrations.length, byType };
  }
}
