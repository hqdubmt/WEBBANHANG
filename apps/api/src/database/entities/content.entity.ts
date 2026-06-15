import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ContentPlatform {
  FACEBOOK = 'facebook',
  TELEGRAM = 'telegram',
  WEBSITE = 'website',
  TIKTOK = 'tiktok',
}

export enum ContentStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Index(['productId', 'status'])
@Index(['platform', 'status'])
@Entity('contents')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column('simple-array', { nullable: true })
  hashtags: string[];

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'enum', enum: ContentPlatform })
  platform: ContentPlatform;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  status: ContentStatus;

  @Column({ nullable: true })
  platformPostId: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
