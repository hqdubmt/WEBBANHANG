import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum MobilePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

@Entity('mobile_sessions')
export class MobileSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  deviceId: string;

  @Column({ type: 'enum', enum: MobilePlatform, nullable: true })
  platform: MobilePlatform;

  @Column({ nullable: true })
  appVersion: string;

  @Column({ nullable: true })
  osVersion: string;

  @Column({ default: 0 })
  durationSeconds: number;

  @Column({ default: 0 })
  screenViews: number;

  @Column({ default: false })
  crashed: boolean;

  @Column('jsonb', { nullable: true })
  events: any;

  @Column({ nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
