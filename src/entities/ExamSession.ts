import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Position } from './Position';

export type ExamType = '国考' | '省考' | '选调' | '事业编';

@Entity()
export class ExamSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'text'
  })
  examType: ExamType;

  @Column({ type: 'simple-json' })
  subjectConfig: {
    xingce: { fullScore: number };
    shenlun: { fullScore: number };
  };

  @Column({ type: 'float' })
  interviewFullScore: number;

  @Column()
  totalScoreFormula: string;

  @OneToMany(() => Position, position => position.examSession)
  positions: Position[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
