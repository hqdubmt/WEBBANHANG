import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum SnapshotPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Index(['period', 'snapshotDate'], { unique: true })
@Entity('revenue_snapshots')
export class RevenueSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SnapshotPeriod })
  period: SnapshotPeriod;

  @Column({ type: 'date' })
  snapshotDate: Date;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalCost: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  grossProfit: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  grossMarginPercent: number;

  @Column({ default: 0 })
  totalOrders: number;

  @Column({ default: 0 })
  totalNewCustomers: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  avgOrderValue: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  affiliateRevenue: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  dropshipRevenue: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column('jsonb', { nullable: true })
  breakdown: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
