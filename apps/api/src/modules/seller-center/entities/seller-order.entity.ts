import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SellerAccount } from './seller-account.entity';

export enum SellerOrderStatus {
  PENDING           = 'pending',
  CONFIRMED         = 'confirmed',
  PROCESSING        = 'processing',
  PACKED            = 'packed',
  SHIPPED           = 'shipped',
  DELIVERED         = 'delivered',
  COMPLETED         = 'completed',
  CANCELLED         = 'cancelled',
  RETURN_REQUESTED  = 'return_requested',
  RETURNED          = 'returned',
}

@Index(['accountId', 'platformOrderId'])
@Index(['accountId', 'status'])
@Index(['accountId', 'platformCreatedAt'])
@Entity('seller_orders')
export class SellerOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accountId: string;

  @ManyToOne(() => SellerAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: SellerAccount;

  @Column()
  platformOrderId: string;

  @Column({ type: 'enum', enum: SellerOrderStatus, default: SellerOrderStatus.PENDING })
  status: SellerOrderStatus;

  // Raw status từ sàn (Lazada: 'pending', Shopee: 'READY_TO_SHIP'...)
  @Column({ nullable: true })
  platformStatus: string;

  @Column({ nullable: true })
  buyerName: string;

  @Column({ nullable: true })
  buyerPhone: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  sellerRevenue: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  items: Array<{
    platformProductId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    image?: string;
  }>;

  // Logistics
  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  shippingProvider: string;

  @Column({ nullable: true })
  shippingFee: number;

  @Column({ nullable: true })
  cancelReason: string;

  @Column({ type: 'jsonb', nullable: true })
  rawData: Record<string, any>;

  @Column({ nullable: true })
  platformCreatedAt: Date;

  @Column({ nullable: true })
  platformUpdatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
