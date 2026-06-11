import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DecisionArea {
  STRATEGY = 'strategy',
  MARKETING = 'marketing',
  SALES = 'sales',
  OPERATIONS = 'operations',
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  PRODUCT = 'product',
  CUSTOMER = 'customer',
}

export enum DecisionOutcome {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
}

@Entity('decision_memory')
export class DecisionMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  decision: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: DecisionArea })
  area: DecisionArea;

  @Column({ type: 'text' })
  expectedOutcome: string;

  @Column({ type: 'text', nullable: true })
  actualOutcome: string;

  @Column({ type: 'text', nullable: true })
  lessonLearned: string;

  @Column({ type: 'enum', enum: DecisionOutcome, default: DecisionOutcome.PENDING })
  outcome: DecisionOutcome;

  @Column({ type: 'varchar', nullable: true })
  madeBy: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  revenueImpact: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  profitImpact: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  roiActual: number;

  @Column({ type: 'int', default: 50 })
  riskLevel: number;

  @Column({ type: 'boolean', default: false })
  isReviewed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
