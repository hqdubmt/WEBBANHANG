import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

@Index(['partnerId', 'createdAt'])
@Index(['referralCode', 'createdAt'])
@Index(['converted'])
@Entity('affiliate_clicks')
export class AffiliateClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  partnerId: string;

  @Column()
  referralCode: string;

  @Column({ nullable: true })
  productId: string;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  referer: string;

  @Column({ nullable: true })
  utmSource: string;

  @Column({ nullable: true })
  utmMedium: string;

  @Column({ nullable: true })
  utmCampaign: string;

  @Column({ default: false })
  converted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
