import { Repository } from "typeorm";
import { Position } from "../entities/Position";
import { AppDataSource } from "../data-source";

export class PositionService {
  private positionRepository: Repository<Position>;

  constructor() {
    this.positionRepository = AppDataSource.getRepository(Position);
  }

  async findAll() {
    return this.positionRepository.find({
      relations: ["examSession", "scores"],
    });
  }

  findById(id: number) {
    return this.positionRepository.findOne({
      where: { id },
      relations: ["examSession", "scores"],
    });
  }

  findByCode(code: string) {
    return this.positionRepository.findOne({
      where: { code },
      relations: ["examSession", "scores"],
    });
  }

  findByExamSession(examSessionId: number) {
    return this.positionRepository.find({
      where: { examSessionId },
      relations: ["examSession", "scores"],
    });
  }

  create(data: Partial<Position>) {
    const position = this.positionRepository.create(data);
    return this.positionRepository.save(position);
  }

  async update(id: number, data: Partial<Position>) {
    await this.positionRepository.update(id, data);
    return this.findById(id);
  }

  delete(id: number) {
    return this.positionRepository.delete(id);
  }

  async getScoreLineHistory(positionId: number) {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      throw new Error("职位不存在");
    }

    const similarPositions = await this.positionRepository.find({
      where: {
        department: position.department,
      },
      relations: ["examSession", "scores"],
    });

    const scoreLines = [];

    for (const pos of similarPositions) {
      if (pos.scores && pos.scores.length > 0) {
        const sortedScores = [...pos.scores]
          .filter((s) => s.totalScore !== null)
          .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

        if (sortedScores.length > 0) {
          const interviewSlots = pos.recruitCount * 3;
          const minInterviewScore =
            sortedScores.length >= interviewSlots
              ? sortedScores[interviewSlots - 1].totalScore
              : sortedScores[sortedScores.length - 1].totalScore;

          scoreLines.push({
            positionId: pos.id,
            positionCode: pos.code,
            examSessionId: pos.examSessionId,
            examSessionName:
              pos.examSession?.name || `考试 ${pos.examSessionId}`,
            examSessionType: pos.examSession?.examType || "未知",
            totalCandidates: sortedScores.length,
            recruitCount: pos.recruitCount,
            interviewSlots,
            maxScore: sortedScores[0].totalScore,
            minScore: sortedScores[sortedScores.length - 1].totalScore,
            avgScore: Number(
              (
                sortedScores.reduce((sum, s) => sum + (s.totalScore || 0), 0) /
                sortedScores.length
              ).toFixed(2),
            ),
            minInterviewScore,
          });
        }
      }
    }

    scoreLines.sort((a, b) => a.examSessionId - b.examSessionId);

    return {
      position: {
        id: position.id,
        code: position.code,
        department: position.department,
      },
      scoreLines,
      dataCount: scoreLines.length,
      hasEnoughData: scoreLines.length >= 2,
      message:
        scoreLines.length < 2
          ? "该职位历史数据不足，仅显示现有可对比数据"
          : "成功获取历年分数线对比数据",
    };
  }
}
