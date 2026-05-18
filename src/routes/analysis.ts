import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AnalysisService } from "../services/AnalysisService";

const analysisService = new AnalysisService();

export async function analysisRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/positions",
    {
      schema: {
        tags: ["分析"],
        summary: "获取所有职位分数分析",
        querystring: {
          type: "object",
          properties: {
            examSessionId: { type: "number" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { examSessionId?: string } }>,
    ) => {
      const examSessionId = request.query.examSessionId
        ? parseInt(request.query.examSessionId)
        : undefined;
      return analysisService.getAllPositionsAnalysis(examSessionId);
    },
  );

  fastify.get(
    "/position/:positionId",
    {
      schema: {
        tags: ["分析"],
        summary: "获取单个职位分数分析",
        params: {
          type: "object",
          properties: {
            positionId: { type: "number" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { positionId: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        return await analysisService.getPositionScoreAnalysis(
          parseInt(request.params.positionId),
        );
      } catch (error: any) {
        reply.status(400).send({ message: error.message });
      }
    },
  );

  fastify.post(
    "/estimate-ranking",
    {
      schema: {
        tags: ["分析"],
        summary: "预估分数排名和进面概率",
        body: {
          type: "object",
          required: ["positionId", "xingceScore", "shenlunScore"],
          properties: {
            positionId: { type: "number" },
            xingceScore: { type: "number" },
            shenlunScore: { type: "number" },
            interviewScore: { type: "number" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        return await analysisService.estimateScoreRanking(
          body.positionId,
          body.xingceScore,
          body.shenlunScore,
          body.interviewScore,
        );
      } catch (error: any) {
        reply.status(400).send({ message: error.message });
      }
    },
  );

  fastify.get(
    "/trend/:examNumber",
    {
      schema: {
        tags: ["分析"],
        summary: "获取考生成绩趋势",
        params: {
          type: "object",
          properties: {
            examNumber: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { examNumber: string } }>) => {
      return analysisService.getScoreTrend(request.params.examNumber);
    },
  );

  fastify.get(
    "/public/:positionId",
    {
      schema: {
        tags: ["分析"],
        summary: "获取脱敏后的公开成绩",
        params: {
          type: "object",
          properties: {
            positionId: { type: "number" },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { positionId: string } }>) => {
      return analysisService.getPublicScores(
        parseInt(request.params.positionId),
      );
    },
  );

  fastify.get(
    "/warning/:examNumber",
    {
      schema: {
        tags: ["分析"],
        summary: "获取考生成绩预警",
        description:
          '当考生笔试总分低于目标职位历史最低进面分的90%时标记为"进面风险高"，低于80%标记为"进面希望渺茫"',
        params: {
          type: "object",
          properties: {
            examNumber: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              examNumber: { type: "string" },
              name: { type: "string" },
              position: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  code: { type: "string" },
                  department: { type: "string" },
                },
              },
              writtenTotalScore: { type: "number" },
              minInterviewScore: { type: "number" },
              warningLevel: {
                type: "string",
                enum: ["进面希望渺茫", "进面风险高", "进面希望较大", "无数据"],
              },
              message: { type: "string" },
              suggestion: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { examNumber: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        return await analysisService.getScoreWarning(request.params.examNumber);
      } catch (error: any) {
        reply.status(400).send({ message: error.message });
      }
    },
  );

  fastify.post(
    "/transfer-recommendations",
    {
      schema: {
        tags: ["分析"],
        summary: "获取职位调剂推荐",
        description:
          "根据考生当前成绩，返回同层级/同地区中竞争比更低且该考生成绩能进面的Top5职位",
        body: {
          type: "object",
          required: ["writtenTotalScore", "currentPositionId"],
          properties: {
            writtenTotalScore: { type: "number", description: "考生笔试总分" },
            currentPositionId: {
              type: "number",
              description: "当前报考职位ID",
            },
            sameRegion: {
              type: "boolean",
              description: "是否只推荐同地区职位",
              default: false,
            },
            sameLevel: {
              type: "boolean",
              description: "是否只推荐同层级职位",
              default: false,
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        return await analysisService.getTransferRecommendations(
          body.writtenTotalScore,
          body.currentPositionId,
          body.sameRegion,
          body.sameLevel,
        );
      } catch (error: any) {
        reply.status(400).send({ message: error.message });
      }
    },
  );

  fastify.get(
    "/rank-history/:examNumber",
    {
      schema: {
        tags: ["分析"],
        summary: "获取考生排名变动历史",
        description: "查询某考生的排名变动历史记录",
        params: {
          type: "object",
          properties: {
            examNumber: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { examNumber: string } }>) => {
      return analysisService.getRankChangeHistory(request.params.examNumber);
    },
  );
}
