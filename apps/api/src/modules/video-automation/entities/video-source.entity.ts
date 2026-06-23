import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum SourceType {
  RSS     = 'rss',
  TIKI    = 'tiki',
  SHOPEE  = 'shopee',
  WEBSITE = 'website',
}

@Entity('video_sources')
export class VideoSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: SourceType, default: SourceType.RSS })
  type: SourceType;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  keyword: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 2 })
  maxItems: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
