import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum RunStatus {
  PENDING          = 'pending',
  FETCHING         = 'fetching',
  SCRIPTING        = 'scripting',
  VOICING          = 'voicing',
  RENDERING        = 'rendering',
  UPLOADING        = 'uploading',
  DONE             = 'done',
  FAILED           = 'failed',
}

export enum RunSource {
  RSS     = 'rss',
  WEBSITE = 'website',
  SHOPEE  = 'shopee',
  TIKTOK_SHOP = 'tiktok_shop',
}

@Entity('video_automation_runs')
export class VideoAutomationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: RunStatus, default: RunStatus.PENDING })
  status: RunStatus;

  @Column({ type: 'enum', enum: RunSource, default: RunSource.RSS })
  source: RunSource;

  @Column({ nullable: true })
  storyTitle: string;

  @Column('text', { nullable: true })
  storyContent: string;

  @Column('text', { nullable: true })
  script: string;

  @Column('text', { nullable: true })
  videoTitle: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { array: true, nullable: true })
  hashtags: string[];

  @Column({ nullable: true })
  voiceFile: string;

  @Column({ nullable: true })
  videoFile: string;

  @Column({ nullable: true })
  storageUrl: string;

  @Column({ nullable: true })
  youtubeUrl: string;

  @Column({ nullable: true })
  facebookUrl: string;

  @Column({ nullable: true })
  tiktokFile: string;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
