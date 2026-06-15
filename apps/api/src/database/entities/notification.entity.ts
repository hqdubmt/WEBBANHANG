import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum NotificationChannel {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  ZALO = 'zalo',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Index(['recipientId', 'status'])
@Index(['channel', 'status'])
@Index(['createdAt'])
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  recipientId: string;

  @Column({ nullable: true })
  recipientType: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ nullable: true })
  externalId: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  errorMessage: string;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
