import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum PriceAction {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  COMBO = 'combo',
  FLASH_SALE = 'flash_sale',
}

@Entity('price_alerts')
@Index(['productId'])
export class PriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  ourPrice: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  competitorPrice: number;

  @Column({ nullable: true })
  competitorPlatform: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  priceDiffPercent: number;

  @Column({ type: 'enum', enum: PriceAction })
  suggestedAction: PriceAction;

  @Column('text', { nullable: true })
  reason: string;

  @Column({ default: false })
  isActedOn: boolean;

  @Column('jsonb', { nullable: true })
  marketData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
