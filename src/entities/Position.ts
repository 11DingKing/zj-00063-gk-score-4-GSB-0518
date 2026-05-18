import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { ExamSession } from "./ExamSession";
import { Score } from "./Score";

export type PositionLevel = "中央" | "省级" | "市级" | "县级" | "乡镇级";

@Entity()
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  department: string;

  @Column({ type: "int" })
  recruitCount: number;

  @Column({ type: "int", default: 0 })
  applicantCount: number;

  @Column({ type: "float", nullable: true })
  minInterviewScore: number | null;

  @Column({
    type: "text",
    default: "中央",
  })
  level: PositionLevel;

  @Column({ default: "全国" })
  region: string;

  @Column({ type: "int" })
  examSessionId: number;

  @ManyToOne(() => ExamSession, (examSession) => examSession.positions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "examSessionId" })
  examSession: ExamSession;

  @OneToMany(() => Score, (score) => score.position)
  scores: Score[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
