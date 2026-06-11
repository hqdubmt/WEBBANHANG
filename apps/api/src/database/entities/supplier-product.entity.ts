import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum SupplierProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
}

@Entity('supplier_products')
export class SupplierProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  supplierId: string;

  @Column({ nullable: true })
  supplierName: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  sku: string;

  @Column({ nullable: true })
  barcode: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  importPrice: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  suggestedRetailPrice: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ default: 0 })
  minOrderQty: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'enum', enum: SupplierProductStatus, default: SupplierProductStatus.ACTIVE })
  status: SupplierProductStatus;

  @Column({ nullable: true })
  leadTimeDays: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  rating: number;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
