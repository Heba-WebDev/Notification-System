import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('push_logs')
export class PushLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  request_id!: string;

  @Column({ type: 'varchar', length: 255 })
  user_id!: string;

  @Column({ type: 'varchar', length: 500 })
  device_token!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, any> | null; // Additional data

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string; // 'pending', 'sent', 'failed'

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
