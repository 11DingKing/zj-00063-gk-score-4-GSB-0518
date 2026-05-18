import { In, Not } from "typeorm";
import { Score } from "../entities/Score";
import { Position } from "../entities/Position";
import { RankChangeHistory } from "../entities/RankChangeHistory";
import { AppDataSource } from "../data-source";
import {
  calculateStatistics,
  estimateRankAndProbability,
  maskName,
} from "../utils/scoreCalculator";

export class AnalysisService {
  private scoreRepository = AppDataSource.getRepository(Score);
  private positionRepository = AppDataSource.getRepository(Position);
  private rankChangeRepository = AppDataSource.getRepository(RankChangeHistory);

  async getPositionScoreAnalysis(positionId: number) {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
      relations: ["examSession"],
    });

    if (!position) throw new Error("职位不存在");

    const scores = await this.scoreRepository.find({
      where: { positionId },
    });

    const totalScores = scores
      .map((s) => s.totalScore)
      .filter((s): s is number => s !== null);

    const stats = calculateStatistics(totalScores);

    return {
      position: {
        id: position.id,
        code: position.code,
        department: position.department,
        recruitCount: position.recruitCount,
      },
      totalCandidates: scores.length,
      statistics: stats,
    };
  }

  async getAllPositionsAnalysis(examSessionId?: number) {
    const where = examSessionId ? { examSessionId } : {};
    const positions = await this.positionRepository.find({
      where,
      relations: ["scores", "examSession"],
    });

    const results = [];
    for (const position of positions) {
      const totalScores = position.scores
        .map((s) => s.totalScore)
        .filter((s): s is number => s !== null);

      const stats = calculateStatistics(totalScores);
      results.push({
        position: {
          id: position.id,
          code: position.code,
          department: position.department,
          recruitCount: position.recruitCount,
        },
        totalCandidates: position.scores.length,
        statistics: stats,
      });
    }

    return results;
  }

  async estimateScoreRanking(
    positionId: number,
    xingceScore: number,
    shenlunScore: number,
    interviewScore?: number,
  ) {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
      relations: ["scores", "examSession"],
    });

    if (!position) throw new Error("职位不存在");

    const existingScores = position.scores
      .map((s) => s.totalScore)
      .filter((s): s is number => s !== null);

    const userWrittenTotal = (xingceScore + shenlunScore) / 2;
    const userTotalScore = interviewScore
      ? (userWrittenTotal + interviewScore) / 2
      : userWrittenTotal;

    const { estimatedRank, interviewProbability } = estimateRankAndProbability(
      userTotalScore,
      existingScores,
    );

    return {
      position: {
        id: position.id,
        code: position.code,
        department: position.department,
      },
      userScore: {
        xingce: xingceScore,
        shenlun: shenlunScore,
        interview: interviewScore || null,
        total: userTotalScore,
      },
      estimatedRank,
      interviewProbability,
      totalCandidates: existingScores.length,
      interviewSlots: position.recruitCount * 3,
    };
  }

  async getScoreTrend(examNumber: string) {
    const scores = await this.scoreRepository.find({
      where: { examNumber },
      relations: ["position", "position.examSession"],
      order: { createdAt: "ASC" },
    });

    return scores.map((score) => ({
      examSession: {
        id: score.position.examSession.id,
        name: score.position.examSession.name,
        type: score.position.examSession.examType,
      },
      position: {
        id: score.position.id,
        code: score.position.code,
        department: score.position.department,
      },
      scores: {
        xingce: score.xingceScore,
        shenlun: score.shenlunScore,
        writtenTotal: score.writtenTotalScore,
        interview: score.interviewScore,
        total: score.totalScore,
      },
      rank: score.rank,
      isInterviewQualified: score.isInterviewQualified,
      examDate: score.createdAt,
    }));
  }

  async getPublicScores(positionId: number) {
    const scores = await this.scoreRepository.find({
      where: { positionId },
      order: { rank: "ASC" },
    });

    return scores.map((score) => ({
      id: score.id,
      name: maskName(score.name),
      examNumber:
        score.examNumber.slice(0, 4) + "****" + score.examNumber.slice(-4),
      xingceScore: score.xingceScore,
      shenlunScore: score.shenlunScore,
      writtenTotalScore: score.writtenTotalScore,
      interviewScore: score.interviewScore,
      totalScore: score.totalScore,
      rank: score.rank,
      isInterviewQualified: score.isInterviewQualified,
    }));
  }

  async getScoreWarning(examNumber: string) {
    const score = await this.scoreRepository.findOne({
      where: { examNumber },
      relations: ["position"],
    });

    if (!score) throw new Error("考生成绩不存在");

    const position = score.position;
    const minInterviewScore = position.minInterviewScore;

    if (!minInterviewScore) {
      return {
        level: "无数据",
        message: "该职位暂无历史最低进面分数数据",
        suggestion: "建议关注后续成绩发布",
      };
    }

    const writtenTotal = score.writtenTotalScore;
    const ninetyPercentThreshold = minInterviewScore * 0.9;
    const eightyPercentThreshold = minInterviewScore * 0.8;

    let warningLevel: string;
    let suggestion: string;
    let message: string;

    if (writtenTotal < eightyPercentThreshold) {
      warningLevel = "进面希望渺茫";
      message = `您的笔试总分（${writtenTotal}）低于目标职位历史最低进面分（${minInterviewScore}）的 80%`;
      suggestion = "建议调剂到竞争比更低的职位，或加强复习准备下次考试";
    } else if (writtenTotal < ninetyPercentThreshold) {
      warningLevel = "进面风险高";
      message = `您的笔试总分（${writtenTotal}）低于目标职位历史最低进面分（${minInterviewScore}）的 90%`;
      suggestion = "建议调剂到竞争比更低的职位，或全力准备面试";
    } else {
      warningLevel = "进面希望较大";
      message = `您的笔试总分（${writtenTotal}）达到目标职位历史最低进面分（${minInterviewScore}）的 90% 以上`;
      suggestion = "建议全力准备面试，保持优势";
    }

    return {
      examNumber,
      name: score.name,
      position: {
        id: position.id,
        code: position.code,
        department: position.department,
      },
      writtenTotalScore: writtenTotal,
      minInterviewScore,
      warningLevel,
      message,
      suggestion,
    };
  }

  async getTransferRecommendations(
    writtenTotalScore: number,
    currentPositionId: number,
    sameRegion?: boolean,
    sameLevel?: boolean,
  ) {
    const currentPosition = await this.positionRepository.findOne({
      where: { id: currentPositionId },
      relations: ["examSession"],
    });

    if (!currentPosition) throw new Error("当前职位不存在");

    let whereCondition: any = {
      examSessionId: currentPosition.examSessionId,
      id: Not(currentPositionId),
    };

    if (sameRegion) {
      whereCondition.region = currentPosition.region;
    }

    if (sameLevel) {
      whereCondition.level = currentPosition.level;
    }

    const allPositions = await this.positionRepository.find({
      where: whereCondition,
      relations: ["scores"],
    });

    const recommendations = [];

    for (const position of allPositions) {
      const competitionRatio = position.applicantCount / position.recruitCount;
      const interviewSlots = position.recruitCount * 3;

      const higherScores = position.scores.filter(
        (s) => s.writtenTotalScore > writtenTotalScore,
      ).length;

      const canEnterInterview = higherScores < interviewSlots;

      if (
        canEnterInterview ||
        position.minInterviewScore === null ||
        writtenTotalScore >= position.minInterviewScore * 0.9
      ) {
        recommendations.push({
          position: {
            id: position.id,
            code: position.code,
            department: position.department,
            level: position.level,
            region: position.region,
          },
          recruitCount: position.recruitCount,
          applicantCount: position.applicantCount,
          competitionRatio: parseFloat(competitionRatio.toFixed(2)),
          minInterviewScore: position.minInterviewScore,
          estimatedRank: higherScores + 1,
          interviewSlots,
          canEnterInterview,
        });
      }
    }

    recommendations.sort((a, b) => {
      if (a.canEnterInterview !== b.canEnterInterview)
        return a.canEnterInterview ? -1 : 1;
      return a.competitionRatio - b.competitionRatio;
    });

    return {
      userWrittenTotalScore: writtenTotalScore,
      currentPosition: {
        id: currentPosition.id,
        code: currentPosition.code,
        department: currentPosition.department,
        level: currentPosition.level,
        region: currentPosition.region,
      },
      recommendations: recommendations.slice(0, 5),
    };
  }

  async getRankChangeHistory(examNumber: string) {
    const changes = await this.rankChangeRepository.find({
      where: { examNumber },
      order: { changeDate: "DESC" },
      relations: ["score", "score.position"],
    });

    return changes.map((change) => ({
      id: change.id,
      examNumber: change.examNumber,
      oldRank: change.oldRank,
      newRank: change.newRank,
      changeDate: change.changeDate,
      position: change.score?.position
        ? {
            id: change.score.position.id,
            code: change.score.position.code,
            department: change.score.position.department,
          }
        : null,
    }));
  }
}
