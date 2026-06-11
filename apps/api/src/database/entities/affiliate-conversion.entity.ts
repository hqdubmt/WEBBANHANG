import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum ConversionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
}

@Entity('affiliate_conversions')
export class AffiliateConversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  partnerId: string;

  @Column()
  referralCode: string;

  @Column({ nullable: true })
  clickId: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  productId: string;

  @Column({ nullable: true })
  productName: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  orderValue: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ type: 'enum', enum: ConversionStatus, default: ConversionStatus.PENDING })
  status: ConversionStatus;

  @Column('text', { nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
