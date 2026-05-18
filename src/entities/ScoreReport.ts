import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Score } from './Score';

export type ReportType = 'personal' | 'competition';

@Entity()
export class ScoreReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  examNumber: string;

  @Column({
    type: 'text'
  })
  reportType: ReportType;

  @Column({ type: 'simple-json' })
  content: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Score, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examNumber', referencedColumnName: 'examNumber' })
  score: Score;
}
