import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Position } from './Position';

@Entity()
export class Score {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  examNumber: string;

  @Column({ type: 'float' })
  xingceScore: number;

  @Column({ type: 'float' })
  shenlunScore: number;

  @Column({ type: 'float' })
  writtenTotalScore: number;

  @Column({ type: 'float', nullable: true })
  interviewScore: number | null;

  @Column({ type: 'float', nullable: true })
  totalScore: number | null;

  @Column({ type: 'int', nullable: true })
  rank: number | null;

  @Column({ type: 'boolean', default: false })
  isInterviewQualified: boolean;

  @Column()
  positionId: number;

  @ManyToOne(() => Position, position => position.scores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
