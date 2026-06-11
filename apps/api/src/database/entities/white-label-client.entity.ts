import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum WhiteLabelStatus {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CHURNED = 'churned',
}

@Entity('white_label_clients')
export class WhiteLabelClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyName: string;

  @Column({ unique: true })
  domain: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  primaryColor: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ type: 'enum', enum: WhiteLabelStatus, default: WhiteLabelStatus.ONBOARDING })
  status: WhiteLabelStatus;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  monthlyFee: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ default: 0 })
  customizationBacklog: number;

  @Column({ nullable: true })
  onboardingStartedAt: Date;

  @Column({ nullable: true })
  onboardingCompletedAt: Date;

  @Column({ nullable: true })
  lastActiveAt: Date;

  @Column('jsonb', { nullable: true })
  customizations: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
