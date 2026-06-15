import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum CouponType {
  PERCENT = 'percent',
  FIXED = 'fixed',
  FREE_SHIPPING = 'free_shipping',
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  @Column('decimal', { precision: 15, scale: 2 })
  value: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  maxDiscountAmount: number;

  @Column({ default: 0 })
  usageLimit: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ default: 1 })
  perUserLimit: number;

  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  applicableProductId: string;

  @Column({ nullable: true })
  applicableSegmentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
