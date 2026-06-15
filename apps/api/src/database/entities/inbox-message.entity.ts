import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum MessageDirection {
  INBOUND  = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageStatus {
  RECEIVED  = 'received',
  READ      = 'read',
  REPLIED   = 'replied',
  FAILED    = 'failed',
}

@Index(['conversationId', 'createdAt'])
@Entity('inbox_messages')
export class InboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column({ type: 'enum', enum: MessageDirection })
  direction: MessageDirection;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  senderId: string;

  @Column({ nullable: true })
  senderName: string;

  @Column({ nullable: true })
  externalId: string;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ nullable: true })
  attachmentType: string;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.RECEIVED })
  status: MessageStatus;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
