import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum AffiliatePlatform {
  SHOPEE = 'shopee',
  LAZADA = 'lazada',
  TIKTOK = 'tiktok',
  CUSTOM = 'custom',
}

export enum AffiliateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('affiliates')
export class Affiliate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column({ type: 'enum', enum: AffiliatePlatform })
  platform: AffiliatePlatform;

  @Column()
  affiliateLink: string;

  @Column({ nullable: true })
  shortLink: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  price: number;

  @Column({ default: 0 })
  clicks: number;

  @Column({ default: 0 })
  conversions: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalEarned: number;

  @Column({ type: 'enum', enum: AffiliateStatus, default: AffiliateStatus.ACTIVE })
  status: AffiliateStatus;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
