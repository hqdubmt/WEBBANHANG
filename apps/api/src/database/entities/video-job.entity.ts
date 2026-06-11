import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum VideoStatus {
  PENDING = 'pending',
  GENERATING_SCRIPT = 'generating_script',
  GENERATING_VOICE = 'generating_voice',
  RENDERING = 'rendering',
  UPLOADING = 'uploading',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum VideoPlatform {
  TIKTOK = 'tiktok',
  FACEBOOK_REELS = 'facebook_reels',
  YOUTUBE_SHORTS = 'youtube_shorts',
}

@Entity('video_jobs')
export class VideoJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column('text', { nullable: true })
  script: string;

  @Column({ nullable: true })
  voiceUrl: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ type: 'enum', enum: VideoPlatform })
  platform: VideoPlatform;

  @Column({ type: 'enum', enum: VideoStatus, default: VideoStatus.PENDING })
  status: VideoStatus;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  durationMs: number;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
