import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('agent_configs')
export class AgentConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  agentName: string;

  @Column({ nullable: true })
  displayName: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ nullable: true })
  cronExpression: string;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: 0 })
  maxRetries: number;

  @Column({ default: 0 })
  timeoutMs: number;

  @Column('jsonb', { nullable: true })
  config: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt: Date;

  @Column({ nullable: true })
  lastRunStatus: string;

  @Column({ default: 0 })
  totalRuns: number;

  @Column({ default: 0 })
  totalTokensUsed: number;

  @Column('decimal', { precision: 15, scale: 6, default: 0 })
  totalCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
