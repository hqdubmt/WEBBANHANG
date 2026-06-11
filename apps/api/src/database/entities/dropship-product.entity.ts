import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum DropshipStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
}

@Entity('dropship_products')
export class DropshipProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  supplierId: string;

  @Column({ nullable: true })
  supplierName: string;

  @Column({ nullable: true })
  sku: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  costPrice: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  suggestedPrice: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  profitMargin: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'enum', enum: DropshipStatus, default: DropshipStatus.ACTIVE })
  status: DropshipStatus;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  soldCount: number;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ nullable: true })
  sourcePlatform: string;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
