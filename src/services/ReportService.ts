import { Repository, Like } from 'typeorm';
import { ScoreReport } from '../entities/ScoreReport';
import { Score } from '../entities/Score';
import { Position } from '../entities/Position';
import { AppDataSource } from '../data-source';

export class ReportService {
  private reportRepository: Repository<ScoreReport>;
  private scoreRepository: Repository<Score>;
  private positionRepository: Repository<Position>;

  constructor() {
    this.reportRepository = AppDataSource.getRepository(ScoreReport);
    this.scoreRepository = AppDataSource.getRepository(Score);
    this.positionRepository = AppDataSource.getRepository(Position);
  }

  async findAll(filters?: { examNumber?: string; reportType?: string; page?: number; limit?: number }) {
    const where: any = {};
    if (filters?.examNumber) {
      where.examNumber = Like(`%${filters.examNumber}%`);
    }
    if (filters?.reportType) {
      where.reportType = filters.reportType;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.reportRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['score', 'score.position'],
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findById(id: number) {
    return this.reportRepository.findOne({
      where: { id },
      relations: ['score', 'score.position', 'score.position.examSession'],
    });
  }

  async createPersonalReport(examNumber: string) {
    const score = await this.scoreRepository.findOne({
      where: { examNumber },
      relations: ['position', 'position.examSession', 'position.scores'],
    });

    if (!score) {
      throw new Error('考生成绩不存在');
    }

    const positionScores = score.position.scores;
    const totalCandidates = positionScores.length;

    const xingceAvg = positionScores.reduce((sum, s) => sum + s.xingceScore, 0) / totalCandidates;
    const shenlunAvg = positionScores.reduce((sum, s) => sum + s.shenlunScore, 0) / totalCandidates;
    const writtenTotalAvg = positionScores.reduce((sum, s) => sum + s.writtenTotalScore, 0) / totalCandidates;

    let rank = 1;
    for (const s of positionScores) {
      if ((s.totalScore || 0) > (score.totalScore || 0)) {
        rank++;
      }
    }

    const rankPercentile = ((totalCandidates - rank + 1) / totalCandidates) * 100;

    const xingceDiff = score.xingceScore - xingceAvg;
    const shenlunDiff = score.shenlunScore - shenlunAvg;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (xingceDiff >= 5) {
      strengths.push('行测表现优秀，高于职位平均分');
    } else if (xingceDiff <= -5) {
      weaknesses.push('行测低于职位平均分，需要重点提升');
    }

    if (shenlunDiff >= 5) {
      strengths.push('申论表现优秀，高于职位平均分');
    } else if (shenlunDiff <= -5) {
      weaknesses.push('申论低于职位平均分，需要重点提升');
    }

    if (rankPercentile >= 80) {
      strengths.push('排名处于上游水平，进面希望较大');
    } else if (rankPercentile <= 30) {
      weaknesses.push('排名处于下游水平，竞争压力较大');
    }

    const suggestions: string[] = [];
    if (weaknesses.length > 0) {
      suggestions.push('重点突破弱项科目，可参加专项培训课程');
      suggestions.push('分析错题原因，针对性练习薄弱模块');
    }
    if (strengths.length > 0) {
      suggestions.push('保持强项科目优势，巩固已有成果');
    }
    suggestions.push('定期进行模拟考试，保持应试状态');
    suggestions.push('关注面试流程和技巧，提前准备面试');

    const content = {
      basicInfo: {
        name: score.name,
        examNumber: score.examNumber,
        position: {
          id: score.position.id,
          code: score.position.code,
          department: score.position.department,
        },
      },
      scoreComparison: {
        xingce: {
          score: score.xingceScore,
          fullScore: 100,
          positionAvg: parseFloat(xingceAvg.toFixed(2)),
          diff: parseFloat(xingceDiff.toFixed(2)),
        },
        shenlun: {
          score: score.shenlunScore,
          fullScore: 100,
          positionAvg: parseFloat(shenlunAvg.toFixed(2)),
          diff: parseFloat(shenlunDiff.toFixed(2)),
        },
        writtenTotal: {
          score: score.writtenTotalScore,
          positionAvg: parseFloat(writtenTotalAvg.toFixed(2)),
        },
        interview: {
          score: score.interviewScore,
          fullScore: score.position.examSession?.interviewFullScore || 100,
        },
        total: {
          score: score.totalScore,
        },
      },
      ranking: {
        rank,
        totalCandidates,
        percentile: parseFloat(rankPercentile.toFixed(2)),
      },
      analysis: {
        strengths,
        weaknesses,
      },
      suggestions,
    };

    const report = this.reportRepository.create({
      examNumber,
      reportType: 'personal',
      content,
    });

    return this.reportRepository.save(report);
  }

  async createCompetitionReport(examNumber: string, targetPositionIds: number[]) {
    const userScore = await this.scoreRepository.findOne({
      where: { examNumber },
    });

    if (!userScore) {
      throw new Error('考生成绩不存在');
    }

    const results = [];

    for (const positionId of targetPositionIds) {
      const position = await this.positionRepository.findOne({
        where: { id: positionId },
        relations: ['scores', 'examSession'],
      });

      if (!position) continue;

      const positionScores = position.scores;
      const totalCandidates = positionScores.length;

      let estimatedRank = 1;
      for (const s of positionScores) {
        if ((s.totalScore || 0) > (userScore.totalScore || 0)) {
          estimatedRank++;
        }
      }

      const interviewSlots = position.recruitCount * 3;
      const canEnterInterview = estimatedRank <= interviewSlots;

      const rankPercentile = ((totalCandidates - estimatedRank + 1) / totalCandidates) * 100;
      const competitionRatio = position.applicantCount / position.recruitCount;

      results.push({
        position: {
          id: position.id,
          code: position.code,
          department: position.department,
          level: position.level,
          region: position.region,
        },
        competition: {
          recruitCount: position.recruitCount,
          applicantCount: position.applicantCount,
          competitionRatio: parseFloat(competitionRatio.toFixed(2)),
          interviewSlots,
          totalCandidates,
        },
        userStanding: {
          userWrittenTotalScore: userScore.writtenTotalScore,
          userTotalScore: userScore.totalScore,
          estimatedRank,
          rankPercentile: parseFloat(rankPercentile.toFixed(2)),
          canEnterInterview,
          interviewProbability: canEnterInterview ? '高' : rankPercentile >= 50 ? '中' : '低',
        },
      });
    }

    results.sort((a, b) => {
      if (a.userStanding.canEnterInterview !== b.userStanding.canEnterInterview) {
        return a.userStanding.canEnterInterview ? -1 : 1;
      }
      return a.userStanding.estimatedRank - b.userStanding.estimatedRank;
    });

    const content = {
      basicInfo: {
        name: userScore.name,
        examNumber: userScore.examNumber,
      },
      comparisonResults: results,
      summary: {
        totalPositions: results.length,
        canEnterInterviewCount: results.filter(r => r.userStanding.canEnterInterview).length,
        bestPosition: results[0]?.position,
      },
    };

    const report = this.reportRepository.create({
      examNumber,
      reportType: 'competition',
      content,
    });

    return this.reportRepository.save(report);
  }

  delete(id: number) {
    return this.reportRepository.delete(id);
  }
}
