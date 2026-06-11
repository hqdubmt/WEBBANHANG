import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum VendorStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

@Entity('marketplace_vendors')
export class MarketplaceVendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: VendorStatus, default: VendorStatus.PENDING })
  status: VendorStatus;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalGmv: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalFees: number;

  @Column({ default: 0 })
  productCount: number;

  @Column({ default: 0 })
  orderCount: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  disputeRate: number;

  @Column('decimal', { precision: 5, scale: 2, default: 5.0 })
  feePercent: number;

  @Column('decimal', { precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ nullable: true })
  lastSaleAt: Date;

  @Column({ nullable: true })
  onboardedAt: Date;

  @Column('jsonb', { nullable: true })
  bankInfo: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
