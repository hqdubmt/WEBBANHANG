import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum LessonType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  UNEXPECTED = 'unexpected',
}

export enum LessonDomain {
  REVENUE = 'revenue',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  TECHNOLOGY = 'technology',
  CUSTOMER = 'customer',
  STRATEGY = 'strategy',
}

export enum LessonStatus {
  ACTIVE = 'active',
  APPLIED = 'applied',
  SUPERSEDED = 'superseded',
}

@Entity('lessons_learned')
export class LessonLearned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LessonType })
  type: LessonType;

  @Column({ type: 'enum', enum: LessonDomain })
  domain: LessonDomain;

  @Column({ type: 'enum', enum: LessonStatus, default: LessonStatus.ACTIVE })
  status: LessonStatus;

  @Column({ type: 'text' })
  whatHappened: string;

  @Column({ type: 'text' })
  whyItHappened: string;

  @Column({ type: 'text' })
  whatWeLearned: string;

  @Column({ type: 'text' })
  whatToChange: string;

  @Column({ type: 'varchar', nullable: true })
  symptom: string;

  @Column({ type: 'varchar', nullable: true })
  rootCause: string;

  @Column({ type: 'varchar', nullable: true })
  impact: string;

  @Column({ type: 'varchar', nullable: true })
  priority: string;

  @Column({ type: 'int', default: 50 })
  confidenceScore: number;

  @Column({ type: 'boolean', default: false })
  isProven: boolean;

  @Column({ type: 'int', default: 0 })
  timesApplied: number;

  @Column({ type: 'int', default: 0 })
  timesSucceeded: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;
}
