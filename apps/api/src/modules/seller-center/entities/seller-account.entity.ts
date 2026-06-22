import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SellerPlatform {
  TIKTOK  = 'tiktok',
  LAZADA  = 'lazada',
  SHOPEE  = 'shopee',
}

export enum SellerAccountStatus {
  ACTIVE      = 'active',
  EXPIRED     = 'expired',
  DISCONNECTED = 'disconnected',
}

@Index(['platform', 'status'])
@Entity('seller_accounts')
export class SellerAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SellerPlatform })
  platform: SellerPlatform;

  @Column({ type: 'enum', enum: SellerAccountStatus, default: SellerAccountStatus.ACTIVE })
  status: SellerAccountStatus;

  @Column({ nullable: true })
  shopName: string;

  @Column({ nullable: true })
  shopId: string;

  @Column({ nullable: true })
  sellerId: string;

  @Column({ nullable: true })
  country: string;

  // OAuth tokens
  @Column({ type: 'text', nullable: true })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  tokenExpiresAt: Date;

  // App credentials (per-account override, fallback to env)
  @Column({ nullable: true })
  appKey: string;

  @Column({ nullable: true })
  appSecret: string;

  // Shopee specific
  @Column({ nullable: true })
  partnerId: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;

  @Column({ nullable: true })
  lastSyncAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
