import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum WorkflowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RUNNING = 'running',
  ERROR = 'error',
}

export enum WorkflowTrigger {
  CRON = 'cron',
  EVENT = 'event',
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'enum', enum: WorkflowTrigger, default: WorkflowTrigger.MANUAL })
  trigger: WorkflowTrigger;

  @Column({ nullable: true })
  cronExpression: string;

  @Column({ nullable: true })
  eventName: string;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.INACTIVE })
  status: WorkflowStatus;

  @Column('jsonb', { nullable: true })
  steps: Record<string, any>[];

  @Column('jsonb', { nullable: true })
  config: Record<string, any>;

  @Column({ default: 0 })
  runCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  nextRunAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
