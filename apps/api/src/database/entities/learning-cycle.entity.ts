import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CyclePhase {
  OBSERVE = 'observe',
  MEASURE = 'measure',
  ANALYZE = 'analyze',
  LEARN = 'learn',
  IMPROVE = 'improve',
  EXECUTE = 'execute',
  VALIDATE = 'validate',
}

export enum CycleStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

export enum CycleScope {
  AI_BOARD = 'ai_board',
  KNOWLEDGE_BRAIN = 'knowledge_brain',
  BUSINESS_OS = 'business_os',
  AGENTS = 'agents',
  CONTENT = 'content',
  SALES = 'sales',
  MARKETING = 'marketing',
  CUSTOMER = 'customer',
}

@Entity('learning_cycles')
export class LearningCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'enum', enum: CycleScope })
  scope: CycleScope;

  @Column({ type: 'enum', enum: CyclePhase, default: CyclePhase.OBSERVE })
  currentPhase: CyclePhase;

  @Column({ type: 'enum', enum: CycleStatus, default: CycleStatus.ACTIVE })
  status: CycleStatus;

  @Column({ type: 'jsonb', nullable: true })
  observations: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  measurements: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  analysis: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  lessons: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  improvementPlan: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  executionResults: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  validationResults: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  iterationCount: number;

  @Column({ type: 'varchar', nullable: true })
  triggeredBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
