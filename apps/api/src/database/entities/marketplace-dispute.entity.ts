import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum DisputeStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DisputeType {
  PRODUCT_QUALITY = 'product_quality',
  NOT_RECEIVED = 'not_received',
  WRONG_ITEM = 'wrong_item',
  REFUND = 'refund',
  FRAUD = 'fraud',
  OTHER = 'other',
}

@Entity('marketplace_disputes')
export class MarketplaceDispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  vendorId: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ type: 'enum', enum: DisputeType, default: DisputeType.OTHER })
  type: DisputeType;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  claimAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column('text', { nullable: true })
  resolution: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
