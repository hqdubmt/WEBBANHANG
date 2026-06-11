import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum DropshipOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('dropship_orders')
export class DropshipOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderCode: string;

  @Column()
  dropshipProductId: string;

  @Column()
  productName: string;

  @Column({ nullable: true })
  supplierId: string;

  @Column({ nullable: true })
  supplierName: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  customerAddress: string;

  @Column({ default: 1 })
  quantity: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  costPrice: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  salePrice: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  profit: number;

  @Column({ type: 'enum', enum: DropshipOrderStatus, default: DropshipOrderStatus.PENDING })
  status: DropshipOrderStatus;

  @Column({ nullable: true })
  trackingCode: string;

  @Column('text', { nullable: true })
  note: string;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
