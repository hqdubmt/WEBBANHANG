import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SellerAccount } from './seller-account.entity';

export enum SellerProductStatus {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
  DELETED  = 'deleted',
  PENDING  = 'pending',
  BANNED   = 'banned',
}

@Index(['accountId', 'platformProductId'])
@Index(['accountId', 'status'])
@Entity('seller_products')
export class SellerProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accountId: string;

  @ManyToOne(() => SellerAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: SellerAccount;

  @Column()
  platformProductId: string;       // ID trên sàn (product_id / item_id / sku_id)

  @Column({ nullable: true })
  platformSkuId: string;

  @Column({ type: 'enum', enum: SellerProductStatus, default: SellerProductStatus.ACTIVE })
  status: SellerProductStatus;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  categoryId: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  salePrice: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  sold: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ nullable: true })
  sku: string;

  @Column({ nullable: true })
  weight: number;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  variants: any[];

  @Column({ nullable: true })
  productUrl: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ nullable: true })
  platformCreatedAt: Date;

  @Column({ nullable: true })
  platformUpdatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
