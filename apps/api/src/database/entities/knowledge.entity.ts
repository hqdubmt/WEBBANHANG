import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum KnowledgeType {
  PRODUCT = 'product',
  FAQ = 'faq',
  POLICY = 'policy',
  TRAINING = 'training',
  MARKETING = 'marketing',
  AFFILIATE = 'affiliate',
  CUSTOMER = 'customer',
}

export enum KnowledgeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity('knowledge')
export class Knowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: KnowledgeType })
  type: KnowledgeType;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  sourceId: string;

  @Column({ nullable: true })
  sourceType: string;

  @Column({ type: 'enum', enum: KnowledgeStatus, default: KnowledgeStatus.PENDING })
  status: KnowledgeStatus;

  @Column({ default: false })
  isIndexed: boolean;

  @Column({ nullable: true })
  vectorId: string;

  @Column({ nullable: true })
  collection: string;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  indexedAt: Date;

  @Column('jsonb', { nullable: true })
  tags: string[];

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
