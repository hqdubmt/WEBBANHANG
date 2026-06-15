import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderSource {
  FACEBOOK = 'facebook',
  TELEGRAM = 'telegram',
  WEBSITE = 'website',
  ZALO = 'zalo',
  MANUAL = 'manual',
}

@Index(['customerId', 'status'])
@Index(['status', 'createdAt'])
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderCode: string;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  @JoinColumn()
  customer: Customer;

  @Column()
  customerId: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: OrderSource, default: OrderSource.WEBSITE })
  source: OrderSource;

  @Column('text', { nullable: true })
  note: string;

  @Column('text', { nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  shippingMethod: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ nullable: true })
  couponCode: string;

  @Column({ nullable: true })
  assignedTo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
