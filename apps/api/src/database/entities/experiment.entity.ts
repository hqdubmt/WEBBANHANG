import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ExperimentStatus {
  HYPOTHESIS = 'hypothesis',
  RUNNING = 'running',
  MEASURING = 'measuring',
  EVALUATING = 'evaluating',
  DECIDED = 'decided',
}

export enum ExperimentDecision {
  PENDING = 'pending',
  ADOPT = 'adopt',
  DISCARD = 'discard',
  ITERATE = 'iterate',
}

@Entity('experiments')
export class Experiment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  hypothesis: string;

  @Column({ type: 'text', nullable: true })
  experimentPlan: string;

  @Column({ type: 'jsonb', nullable: true })
  measurements: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  evaluation: string;

  @Column({ type: 'enum', enum: ExperimentDecision, default: ExperimentDecision.PENDING })
  decision: ExperimentDecision;

  @Column({ type: 'text', nullable: true })
  decisionReason: string;

  @Column({ type: 'enum', enum: ExperimentStatus, default: ExperimentStatus.HYPOTHESIS })
  status: ExperimentStatus;

  @Column({ type: 'varchar', nullable: true })
  scope: string;

  @Column({ type: 'int', default: 0 })
  successScore: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
