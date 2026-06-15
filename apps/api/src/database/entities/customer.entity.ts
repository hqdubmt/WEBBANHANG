import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Order } from './order.entity';

export enum CustomerTier {
  NEW = 'new',
  REGULAR = 'regular',
  VIP = 'vip',
}

@Index(['phone'])
@Index(['email'])
@Index(['tier'])
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  telegramId: string;

  @Column({ nullable: true })
  facebookId: string;

  @Column({ nullable: true })
  zaloId: string;

  @Column({ type: 'enum', enum: CustomerTier, default: CustomerTier.NEW })
  tier: CustomerTier;

  @Column('text', { nullable: true })
  note: string;

  @Column({ default: 0 })
  totalOrders: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalSpent: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  ltv: number;

  @Column({ nullable: true })
  acquisitionSource: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  churnRisk: number;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  birthday: string;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
