import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CHURNED = 'churned',
  TRIAL = 'trial',
}

export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ type: 'enum', enum: TenantPlan, default: TenantPlan.STARTER })
  plan: TenantPlan;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.TRIAL })
  status: TenantStatus;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  monthlyRevenue: number;

  @Column({ default: 99.9 })
  slaTarget: number;

  @Column('decimal', { precision: 5, scale: 2, default: 100 })
  uptimePercent: number;

  @Column({ default: 0 })
  apiCallsToday: number;

  @Column({ default: 10000 })
  apiQuotaDaily: number;

  @Column('jsonb', { nullable: true })
  settings: any;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
