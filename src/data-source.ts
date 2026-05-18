import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { ExamSession } from "./entities/ExamSession";
import { Position } from "./entities/Position";
import { Score } from "./entities/Score";
import { RankChangeHistory } from "./entities/RankChangeHistory";
import { ScoreReport } from "./entities/ScoreReport";

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: "./data/app.db",
  synchronize: true,
  logging: false,
  entities: [User, ExamSession, Position, Score, RankChangeHistory, ScoreReport],
  migrations: [],
  subscribers: [],
});
