import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum AgentName {
  // Agent 01
  TREND = 'trend',
  // Agent 02
  AFFILIATE = 'affiliate',
  // Agent 03
  CONTENT = 'content',
  // Agent 04
  PUBLISHER = 'publisher',
  // Agent 05
  LEAD = 'lead',
  // Agent 06
  SALES = 'sales',
  // Agent 07
  CRM = 'crm',
  // Agent 08
  VIDEO = 'video',
  // Agent 09
  SEO = 'seo',
  // Agent 10
  TREND_PREDICTOR = 'trend_predictor',
  // Agent 11
  PRICE = 'price',
  // Agent 12
  SEGMENTATION = 'segmentation',
  // Agent 13
  EMAIL = 'email',
  // Agent 14
  TELEGRAM = 'telegram',
  // Agent 15
  KNOWLEDGE = 'knowledge',
  // Agent 16
  MASTER = 'master',
  // Extra
  REVIEW = 'review',
  // V4 Agents
  // Agent 17
  VIDEO_OPTIMIZER = 'video_optimizer',
  // Agent 18
  COMPETITOR_MONITOR = 'competitor_monitor',
  // Agent 19
  DEMAND_FORECASTER = 'demand_forecaster',
  // Agent 20
  REPRICING = 'repricing',
  // V5 Agents
  // Agent 22
  MARKETPLACE_OPTIMIZER = 'marketplace_optimizer',
  // Agent 23
  MOBILE_ENGAGEMENT = 'mobile_engagement',
  // Agent 24
  ENTERPRISE_HEALTH = 'enterprise_health',
  // Agent 25
  WHITELABEL_ONBOARDING = 'whitelabel_onboarding',
}

export enum AgentRunStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RUNNING = 'running',
}

@Index(['agent', 'createdAt'])
@Index(['status', 'createdAt'])
@Entity('agent_logs')
export class AgentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AgentName })
  agent: AgentName;

  @Column({ type: 'enum', enum: AgentRunStatus, default: AgentRunStatus.RUNNING })
  status: AgentRunStatus;

  @Column('jsonb', { nullable: true })
  input: any;

  @Column('jsonb', { nullable: true })
  output: any;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  tokensUsed: number;

  @Column('decimal', { precision: 10, scale: 6, default: 0 })
  cost: number;

  @Column({ default: 0 })
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
