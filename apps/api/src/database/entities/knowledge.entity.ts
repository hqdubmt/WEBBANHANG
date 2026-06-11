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

export enum KnowledgeDomain {
  PRODUCT = 'product',
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  MARKET = 'market',
  OPERATIONAL = 'operational',
}

export enum KnowledgeTier {
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
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

  @Column({ type: 'enum', enum: KnowledgeDomain, nullable: true })
  domain: KnowledgeDomain;

  @Column({ type: 'enum', enum: KnowledgeTier, default: KnowledgeTier.MEDIUM_TERM })
  tier: KnowledgeTier;

  @Column({ type: 'int', default: 100 })
  accuracy: number;

  @Column({ type: 'int', default: 100 })
  completeness: number;

  @Column({ type: 'int', default: 100 })
  freshness: number;

  @Column({ type: 'int', default: 50 })
  businessValue: number;

  @Column('jsonb', { nullable: true })
  relationIds: string[];

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column('jsonb', { nullable: true })
  tags: string[];

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
