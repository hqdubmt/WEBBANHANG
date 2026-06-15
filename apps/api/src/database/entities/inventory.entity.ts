import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Product } from './product.entity';

export enum InventoryTxType {
  IMPORT = 'import',
  EXPORT = 'export',
  ADJUST = 'adjust',
  RETURN = 'return',
}

@Index(['productId', 'createdAt'])
@Index(['txType', 'createdAt'])
@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'enum', enum: InventoryTxType })
  txType: InventoryTxType;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  stockBefore: number;

  @Column({ default: 0 })
  stockAfter: number;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  supplierId: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  unitCost: number;

  @Column('text', { nullable: true })
  note: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
