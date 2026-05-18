import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Score } from './Score';

@Entity()
export class RankChangeHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  examNumber: string;

  @Column({ type: 'int', nullable: true })
  oldRank: number | null;

  @Column({ type: 'int', nullable: true })
  newRank: number | null;

  @Column({ type: 'int' })
  positionId: number;

  @ManyToOne(() => Score, { onDelete: 'CASCADE' })
  @JoinColumn({ referencedColumnName: 'examNumber' })
  score: Score;

  @CreateDateColumn()
  changeDate: Date;
}
