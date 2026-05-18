import { Repository } from "typeorm";
import { Score } from "../entities/Score";
import { Position } from "../entities/Position";
import { RankChangeHistory } from "../entities/RankChangeHistory";
import { AppDataSource } from "../data-source";
import {
  calculateWrittenTotal,
  calculateTotalScore,
} from "../utils/scoreCalculator";

export class ScoreService {
  private scoreRepository: Repository<Score>;
  private positionRepository: Repository<Position>;
  private rankChangeRepository: Repository<RankChangeHistory>;

  constructor() {
    this.scoreRepository = AppDataSource.getRepository(Score);
    this.positionRepository = AppDataSource.getRepository(Position);
    this.rankChangeRepository = AppDataSource.getRepository(RankChangeHistory);
  }

  async findAll() {
    return this.scoreRepository.find({
      relations: ["position", "position.examSession"],
    });
  }

  findById(id: number) {
    return this.scoreRepository.findOne({
      where: { id },
      relations: ["position", "position.examSession"],
    });
  }

  findByExamNumber(examNumber: string) {
    return this.scoreRepository.findOne({
      where: { examNumber },
      relations: ["position", "position.examSession"],
    });
  }

  findByPosition(positionId: number) {
    return this.scoreRepository.find({
      where: { positionId },
      relations: ["position", "position.examSession"],
      order: { totalScore: "DESC" },
    });
  }

  async create(data: Partial<Score>) {
    const position = await this.positionRepository.findOne({
      where: { id: data.positionId },
      relations: ["examSession"],
    });

    if (!position) throw new Error("职位不存在");

    const xingceScore = data.xingceScore ?? 0;
    const shenlunScore = data.shenlunScore ?? 0;

    const writtenTotal = calculateWrittenTotal(
      xingceScore,
      shenlunScore,
      position.examSession.totalScoreFormula,
    );

    const totalScore = calculateTotalScore(
      writtenTotal,
      data.interviewScore ?? null,
      position.examSession.totalScoreFormula,
    );

    const score = this.scoreRepository.create({
      ...data,
      writtenTotalScore: writtenTotal,
      totalScore,
    });

    return this.scoreRepository.save(score);
  }

  async update(id: number, data: Partial<Score>) {
    const existingScore = await this.findById(id);
    if (!existingScore) throw new Error("成绩不存在");

    const position = await this.positionRepository.findOne({
      where: { id: data.positionId || existingScore.positionId },
      relations: ["examSession"],
    });

    if (!position) throw new Error("职位不存在");

    const xingceScore = data.xingceScore ?? existingScore.xingceScore;
    const shenlunScore = data.shenlunScore ?? existingScore.shenlunScore;
    const interviewScore = data.interviewScore ?? existingScore.interviewScore;

    const writtenTotal = calculateWrittenTotal(
      xingceScore,
      shenlunScore,
      position.examSession.totalScoreFormula,
    );

    const totalScore = calculateTotalScore(
      writtenTotal,
      interviewScore,
      position.examSession.totalScoreFormula,
    );

    await this.scoreRepository.update(id, {
      ...data,
      writtenTotalScore: writtenTotal,
      totalScore,
    });

    return this.findById(id);
  }

  delete(id: number) {
    return this.scoreRepository.delete(id);
  }

  async calculateRankForPosition(positionId: number) {
    const scores = await this.scoreRepository.find({
      where: { positionId },
      order: { totalScore: "DESC", xingceScore: "DESC" },
    });

    if (scores.length === 0) return [];

    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });
    if (!position) throw new Error("职位不存在");

    const interviewSlotCount = position.recruitCount * 3;
    const results: Score[] = [];

    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      const oldRank = score.rank;
      const newRank = i + 1;

      if (oldRank !== newRank) {
        const rankChange = this.rankChangeRepository.create({
          examNumber: score.examNumber,
          oldRank,
          newRank,
          positionId,
        });
        await this.rankChangeRepository.save(rankChange);
      }

      score.rank = newRank;
      score.isInterviewQualified = i < interviewSlotCount;
      await this.scoreRepository.save(score);
      results.push(score);
    }

    return results;
  }

  async bulkImport(csvData: string) {
    const lines = csvData.trim().split("\n");
    const successResults = [];
    const errorResults: { lineNumber: number; line: string; reason: string }[] =
      [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      try {
        const columns = line.split(",").map((s) => s.trim());
        const [examNumber, name, positionCode, xingce, shenlun, interview] =
          columns;

        if (columns.length < 5) {
          errorResults.push({
            lineNumber,
            line,
            reason:
              "缺少必要字段，格式应为：准考证号,姓名,职位代码,行测,申论,[面试]",
          });
          continue;
        }

        if (!examNumber || !name || !positionCode || !xingce || !shenlun) {
          errorResults.push({
            lineNumber,
            line,
            reason: "必填字段不能为空",
          });
          continue;
        }

        const xingceScore = parseFloat(xingce);
        const shenlunScore = parseFloat(shenlun);

        if (isNaN(xingceScore) || isNaN(shenlunScore)) {
          errorResults.push({
            lineNumber,
            line,
            reason: "行测或申论分数格式错误，应为数字",
          });
          continue;
        }

        let interviewScore: number | null = null;
        if (interview) {
          interviewScore = parseFloat(interview);
          if (isNaN(interviewScore)) {
            errorResults.push({
              lineNumber,
              line,
              reason: "面试分数格式错误，应为数字",
            });
            continue;
          }
        }

        const position = await this.positionRepository.findOne({
          where: { code: positionCode },
          relations: ["examSession"],
        });

        if (!position) {
          errorResults.push({
            lineNumber,
            line,
            reason: `职位代码 ${positionCode} 不存在`,
          });
          continue;
        }

        const writtenTotal = calculateWrittenTotal(
          xingceScore,
          shenlunScore,
          position.examSession.totalScoreFormula,
        );

        const totalScore = calculateTotalScore(
          writtenTotal,
          interviewScore,
          position.examSession.totalScoreFormula,
        );

        const existingScore = await this.scoreRepository.findOne({
          where: { examNumber },
        });

        if (existingScore) {
          existingScore.name = name;
          existingScore.xingceScore = xingceScore;
          existingScore.shenlunScore = shenlunScore;
          existingScore.writtenTotalScore = writtenTotal;
          existingScore.interviewScore = interviewScore;
          existingScore.totalScore = totalScore;
          existingScore.positionId = position.id;
          successResults.push(await this.scoreRepository.save(existingScore));
        } else {
          const score = this.scoreRepository.create({
            examNumber,
            name,
            xingceScore,
            shenlunScore,
            writtenTotalScore: writtenTotal,
            interviewScore,
            totalScore,
            positionId: position.id,
          });
          successResults.push(await this.scoreRepository.save(score));
        }
      } catch (error: any) {
        errorResults.push({
          lineNumber,
          line,
          reason: error.message || "未知错误",
        });
      }
    }

    return {
      successCount: successResults.length,
      errorCount: errorResults.length,
      totalCount: lines.length,
      successResults,
      errorResults,
    };
  }
}
