import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum AffiliatePartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum AffiliatePartnerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

@Entity('affiliate_partners')
export class AffiliatePartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true })
  referralCode: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  socialFacebook: string;

  @Column({ nullable: true })
  socialTiktok: string;

  @Column({ nullable: true })
  socialTelegram: string;

  @Column({ type: 'enum', enum: AffiliatePartnerStatus, default: AffiliatePartnerStatus.PENDING })
  status: AffiliatePartnerStatus;

  @Column({ type: 'enum', enum: AffiliatePartnerTier, default: AffiliatePartnerTier.BRONZE })
  tier: AffiliatePartnerTier;

  @Column('decimal', { precision: 5, scale: 2, default: 5 })
  commissionRate: number;

  @Column({ default: 0 })
  totalClicks: number;

  @Column({ default: 0 })
  totalConversions: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalEarned: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  pendingPayout: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  paidOut: number;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccount: string;

  @Column({ nullable: true })
  bankOwner: string;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
