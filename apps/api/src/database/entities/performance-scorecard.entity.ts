import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ScorecardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('performance_scorecards')
export class PerformanceScorecard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ScorecardPeriod })
  period: ScorecardPeriod;

  @Column({ type: 'date' })
  periodDate: Date;

  @Column({ type: 'int', default: 0 })
  revenueScore: number;

  @Column({ type: 'int', default: 0 })
  profitScore: number;

  @Column({ type: 'int', default: 0 })
  marketingScore: number;

  @Column({ type: 'int', default: 0 })
  operationsScore: number;

  @Column({ type: 'int', default: 0 })
  technologyScore: number;

  @Column({ type: 'int', default: 0 })
  customerScore: number;

  @Column({ type: 'int', default: 0 })
  growthScore: number;

  @Column({ type: 'int', default: 0 })
  overallScore: number;

  @Column({ type: 'jsonb', nullable: true })
  dailyAnswers: {
    bestPerforming: string;
    worstPerforming: string;
    revenueDriver: string;
    revenueDrain: string;
    shouldContinue: string;
    shouldStop: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  weeklyRetrospective: {
    wins: string[];
    losses: string[];
    opportunities: string[];
    risks: string[];
    strategicAdjustments: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  monthlyEvolution: {
    revenueGrowth: number;
    profitGrowth: number;
    marketPosition: string;
    customerGrowth: number;
    aiPerformance: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  rawMetrics: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
