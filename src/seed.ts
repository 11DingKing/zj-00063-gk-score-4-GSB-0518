import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { User } from "./entities/User";
import { ExamSession } from "./entities/ExamSession";
import { Position } from "./entities/Position";
import { Score } from "./entities/Score";
import { ScoreReport } from "./entities/ScoreReport";

async function seed() {
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(User);
  const examSessionRepository = AppDataSource.getRepository(ExamSession);
  const positionRepository = AppDataSource.getRepository(Position);
  const scoreRepository = AppDataSource.getRepository(Score);

  await scoreRepository.clear();
  await positionRepository.clear();
  await examSessionRepository.clear();
  await userRepository.clear();

  const admin = userRepository.create({
    username: "admin",
    password: "admin123456",
    role: "Admin",
  });
  await userRepository.save(admin);

  const analyst = userRepository.create({
    username: "analyst1",
    password: "analyst123456",
    role: "Analyst",
  });
  await userRepository.save(analyst);

  const nationalExam = examSessionRepository.create({
    name: "2026 国考",
    examType: "国考",
    subjectConfig: {
      xingce: { fullScore: 100 },
      shenlun: { fullScore: 100 },
    },
    interviewFullScore: 100,
    totalScoreFormula: "(xingce + shenlun) / 2 * 0.5 + interview * 0.5",
  });
  await examSessionRepository.save(nationalExam);

  const provincialExam = examSessionRepository.create({
    name: "2026 省考-浙江",
    examType: "省考",
    subjectConfig: {
      xingce: { fullScore: 100 },
      shenlun: { fullScore: 100 },
    },
    interviewFullScore: 100,
    totalScoreFormula: "(xingce + shenlun + interview) / 3",
  });
  await examSessionRepository.save(provincialExam);

  const nationalPositions: Position[] = [];
  for (let i = 1; i <= 3; i++) {
    const position = positionRepository.create({
      code: `GK2026-${String(i).padStart(3, "0")}`,
      department: `中央部委${i}`,
      recruitCount: i,
      applicantCount: i * 100,
      minInterviewScore: 110 + i * 5,
      level: "中央",
      region: "全国",
      examSessionId: nationalExam.id,
    });
    nationalPositions.push(await positionRepository.save(position));
  }

  const provincialPositions: Position[] = [];
  for (let i = 1; i <= 2; i++) {
    const position = positionRepository.create({
      code: `ZJ2026-${String(i).padStart(3, "0")}`,
      department: `浙江省厅${i}`,
      recruitCount: i,
      applicantCount: i * 80,
      minInterviewScore: 105 + i * 5,
      level: "省级",
      region: "浙江省",
      examSessionId: provincialExam.id,
    });
    provincialPositions.push(await positionRepository.save(position));
  }

  const lastNames = [
    "张",
    "王",
    "李",
    "赵",
    "刘",
    "陈",
    "杨",
    "黄",
    "周",
    "吴",
  ];
  const firstNames = [
    "伟",
    "芳",
    "娜",
    "敏",
    "静",
    "强",
    "磊",
    "军",
    "洋",
    "勇",
  ];

  for (let posIdx = 0; posIdx < nationalPositions.length; posIdx++) {
    const position = nationalPositions[posIdx];
    for (let i = 1; i <= 15; i++) {
      const xingce = 55 + Math.random() * 40;
      const shenlun = 50 + Math.random() * 45;
      const interview = 60 + Math.random() * 35;
      const writtenTotal = (xingce + shenlun) / 2;
      const totalScore = writtenTotal * 0.5 + interview * 0.5;

      const score = scoreRepository.create({
        name:
          lastNames[Math.floor(Math.random() * lastNames.length)] +
          firstNames[Math.floor(Math.random() * firstNames.length)],
        examNumber: `GK2026${String(posIdx + 1).padStart(2, "0")}${String(i).padStart(4, "0")}`,
        xingceScore: parseFloat(xingce.toFixed(2)),
        shenlunScore: parseFloat(shenlun.toFixed(2)),
        writtenTotalScore: parseFloat(writtenTotal.toFixed(2)),
        interviewScore: parseFloat(interview.toFixed(2)),
        totalScore: parseFloat(totalScore.toFixed(2)),
        positionId: position.id,
        rank: null,
        isInterviewQualified: false,
      });
      await scoreRepository.save(score);
    }
  }

  for (let posIdx = 0; posIdx < provincialPositions.length; posIdx++) {
    const position = provincialPositions[posIdx];
    for (let i = 1; i <= 10; i++) {
      const xingce = 50 + Math.random() * 45;
      const shenlun = 55 + Math.random() * 40;
      const interview = 65 + Math.random() * 30;
      const writtenTotal = (xingce + shenlun) / 2;
      const totalScore = (xingce + shenlun + interview) / 3;

      const score = scoreRepository.create({
        name:
          lastNames[Math.floor(Math.random() * lastNames.length)] +
          firstNames[Math.floor(Math.random() * firstNames.length)],
        examNumber: `ZJ2026${String(posIdx + 1).padStart(2, "0")}${String(i).padStart(4, "0")}`,
        xingceScore: parseFloat(xingce.toFixed(2)),
        shenlunScore: parseFloat(shenlun.toFixed(2)),
        writtenTotalScore: parseFloat(writtenTotal.toFixed(2)),
        interviewScore: parseFloat(interview.toFixed(2)),
        totalScore: parseFloat(totalScore.toFixed(2)),
        positionId: position.id,
        rank: null,
        isInterviewQualified: false,
      });
      await scoreRepository.save(score);
    }
  }

  const reportRepository = AppDataSource.getRepository(ScoreReport);
  const sampleExamNumbers = [
    "GK2026010001",
    "GK2026010002",
    "GK2026010003",
  ];

  for (const examNumber of sampleExamNumbers) {
    const score = await scoreRepository.findOne({
      where: { examNumber },
      relations: ["position", "position.examSession", "position.scores"],
    });

    if (score) {
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
        strengths.push("行测表现优秀，高于职位平均分");
      } else if (xingceDiff <= -5) {
        weaknesses.push("行测低于职位平均分，需要重点提升");
      }

      if (shenlunDiff >= 5) {
        strengths.push("申论表现优秀，高于职位平均分");
      } else if (shenlunDiff <= -5) {
        weaknesses.push("申论低于职位平均分，需要重点提升");
      }

      if (rankPercentile >= 80) {
        strengths.push("排名处于上游水平，进面希望较大");
      } else if (rankPercentile <= 30) {
        weaknesses.push("排名处于下游水平，竞争压力较大");
      }

      const suggestions: string[] = [];
      if (weaknesses.length > 0) {
        suggestions.push("重点突破弱项科目，可参加专项培训课程");
        suggestions.push("分析错题原因，针对性练习薄弱模块");
      }
      if (strengths.length > 0) {
        suggestions.push("保持强项科目优势，巩固已有成果");
      }
      suggestions.push("定期进行模拟考试，保持应试状态");
      suggestions.push("关注面试流程和技巧，提前准备面试");

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
            fullScore: 100,
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

      const report = reportRepository.create({
        examNumber,
        reportType: "personal",
        content,
      });
      await reportRepository.save(report);
    }
  }

  console.log("数据填充完成！");
  console.log(`创建用户: ${admin.username}, ${analyst.username}`);
  console.log(`创建考试场次: ${nationalExam.name}, ${provincialExam.name}`);
  console.log(`创建国考职位: ${nationalPositions.length} 个，每职位 15 名考生`);
  console.log(
    `创建省考职位: ${provincialPositions.length} 个，每职位 10 名考生`,
  );
  console.log(`创建个人分析报告: 3 份`);

  process.exit(0);
}

seed().catch((error) => {
  console.error("数据填充失败:", error);
  process.exit(1);
});
