import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
}

@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
@Index(['action', 'createdAt'])
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userEmail: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column()
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column('jsonb', { nullable: true })
  before: Record<string, any>;

  @Column('jsonb', { nullable: true })
  after: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
