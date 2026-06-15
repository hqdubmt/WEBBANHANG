import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum SegmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('customer_segments')
export class CustomerSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'enum', enum: SegmentStatus, default: SegmentStatus.ACTIVE })
  status: SegmentStatus;

  // Rules stored as jsonb: [{field, operator, value}]
  @Column('jsonb', { nullable: true })
  rules: Record<string, any>[];

  @Column({ default: 0 })
  memberCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastCalculatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
