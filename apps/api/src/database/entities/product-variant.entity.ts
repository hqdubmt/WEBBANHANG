import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Product } from './product.entity';

export enum VariantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
}

@Index(['productId', 'status'])
@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  name: string;

  @Column({ nullable: true })
  sku: string;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  costPrice: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'enum', enum: VariantStatus, default: VariantStatus.ACTIVE })
  status: VariantStatus;

  // e.g. { color: 'red', size: 'L', weight: '500g' }
  @Column('jsonb', { nullable: true })
  attributes: Record<string, string>;

  @Column({ nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
