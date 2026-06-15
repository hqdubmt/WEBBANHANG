import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Index(['orderId'])
@Index(['productId'])
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn()
  order: Order;

  @Column()
  orderId: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  productImage: string;

  @Column({ nullable: true })
  affiliateLink: string;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @Column({ default: 1 })
  quantity: number;

  @Column('decimal', { precision: 15, scale: 2 })
  total: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  commission: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
