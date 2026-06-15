import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum InboxChannel {
  FACEBOOK  = 'facebook',
  TELEGRAM  = 'telegram',
  WEB_CHAT  = 'web_chat',
  ZALO      = 'zalo',
}

export enum ConversationStatus {
  OPEN       = 'open',
  ASSIGNED   = 'assigned',
  RESOLVED   = 'resolved',
  CLOSED     = 'closed',
}

@Index(['channel', 'externalId'], { unique: true })
@Index(['status', 'lastMessageAt'])
@Index(['customerId'])
@Entity('inbox_conversations')
export class InboxConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: InboxChannel })
  channel: InboxChannel;

  @Column()
  externalId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  customerAvatar: string;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.OPEN })
  status: ConversationStatus;

  @Column({ nullable: true })
  assignedTo: string;

  @Column('text', { nullable: true })
  lastMessage: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
