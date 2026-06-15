import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';
import { AgentName } from './agent-log.entity';

export enum AiDecisionOutcome {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILURE = 'failure',
  SKIPPED = 'skipped',
}

@Index(['agentName', 'createdAt'])
@Index(['decisionType', 'createdAt'])
@Index(['outcome'])
@Entity('ai_decisions')
export class AiDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AgentName })
  agentName: AgentName;

  @Column()
  decisionType: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { nullable: true })
  input: Record<string, any>;

  @Column('jsonb', { nullable: true })
  decision: Record<string, any>;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({ type: 'enum', enum: AiDecisionOutcome, default: AiDecisionOutcome.PENDING })
  outcome: AiDecisionOutcome;

  @Column('jsonb', { nullable: true })
  outcomeData: Record<string, any>;

  @Column({ nullable: true })
  relatedEntityType: string;

  @Column({ nullable: true })
  relatedEntityId: string;

  @Column({ nullable: true })
  agentLogId: string;

  @CreateDateColumn()
  createdAt: Date;
}
