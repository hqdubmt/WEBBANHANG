import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum LeadPlatform {
  FACEBOOK = 'facebook',
  TELEGRAM = 'telegram',
  ZALO = 'zalo',
  TIKTOK = 'tiktok',
  WEBSITE = 'website',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  LOST = 'lost',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LeadPlatform })
  platform: LeadPlatform;

  @Column({ nullable: true })
  platformUserId: string;

  @Column({ nullable: true })
  name: string;

  @Column('text')
  content: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ nullable: true })
  intent: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ nullable: true })
  customerId: string;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
