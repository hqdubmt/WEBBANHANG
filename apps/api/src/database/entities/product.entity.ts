import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum ProductSource {
  SHOPEE = 'shopee',
  LAZADA = 'lazada',
  TIKTOK = 'tiktok',
  MANUAL = 'manual',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  price: number;

  @Column({ nullable: true })
  image: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'enum', enum: ProductSource, default: ProductSource.MANUAL })
  source: ProductSource;

  @Column({ nullable: true })
  sourceId: string;

  @Column({ nullable: true })
  affiliateLink: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  commission: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  trendScore: number;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.PENDING })
  status: ProductStatus;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
