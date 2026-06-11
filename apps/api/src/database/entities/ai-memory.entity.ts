import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum MemoryType {
  CHAT_HISTORY = 'chat_history',
  CUSTOMER_BEHAVIOR = 'customer_behavior',
  PURCHASE_HISTORY = 'purchase_history',
  VIEWED_PRODUCTS = 'viewed_products',
}

@Entity('ai_memories')
@Index(['customerId', 'type'])
export class AiMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ type: 'enum', enum: MemoryType })
  type: MemoryType;

  @Column('jsonb')
  data: Record<string, any>;

  @Column('text', { nullable: true })
  summary: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
