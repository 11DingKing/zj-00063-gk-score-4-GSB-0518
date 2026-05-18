import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PositionService } from "../services/PositionService";

const positionService = new PositionService();

interface PositionParams {
  id: string;
}

interface PositionQuery {
  examSessionId?: string;
  code?: string;
}

export async function positionRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["职位"],
        summary: "获取所有职位",
        querystring: {
          type: "object",
          properties: {
            examSessionId: { type: "number" },
            code: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: PositionQuery }>) => {
      if (request.query.examSessionId) {
        return positionService.findByExamSession(
          parseInt(request.query.examSessionId),
        );
      }
      if (request.query.code) {
        const position = await positionService.findByCode(request.query.code);
        return position ? [position] : [];
      }
      return positionService.findAll();
    },
  );

  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["职位"],
        summary: "根据ID获取职位",
        params: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: PositionParams }>,
      reply: FastifyReply,
    ) => {
      const position = await positionService.findById(
        parseInt(request.params.id),
      );
      if (!position) {
        reply.status(404).send({ message: "职位不存在" });
        return;
      }
      return position;
    },
  );

  fastify.get(
    "/:id/score-line",
    {
      schema: {
        tags: ["职位"],
        summary: "获取职位历年分数线对比",
        description:
          "返回同一部门的历年职位分数线，数据不足时返回友好提示而非错误",
        params: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: PositionParams }>,
      reply: FastifyReply,
    ) => {
      try {
        return await positionService.getScoreLineHistory(
          parseInt(request.params.id),
        );
      } catch (error: any) {
        reply.status(400).send({ message: error.message });
      }
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["职位"],
        summary: "创建职位",
        body: {
          type: "object",
          required: ["code", "department", "recruitCount", "examSessionId"],
          properties: {
            code: { type: "string" },
            department: { type: "string" },
            recruitCount: { type: "number" },
            applicantCount: { type: "number" },
            minInterviewScore: { type: "number" },
            examSessionId: { type: "number" },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: Partial<any> }>) => {
      return positionService.create(request.body);
    },
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["职位"],
        summary: "更新职位",
        params: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
        body: {
          type: "object",
          properties: {
            code: { type: "string" },
            department: { type: "string" },
            recruitCount: { type: "number" },
            applicantCount: { type: "number" },
            minInterviewScore: { type: "number" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: PositionParams; Body: Partial<any> }>,
      reply: FastifyReply,
    ) => {
      const position = await positionService.update(
        parseInt(request.params.id),
        request.body,
      );
      if (!position) {
        reply.status(404).send({ message: "职位不存在" });
        return;
      }
      return position;
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["职位"],
        summary: "删除职位",
        params: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: PositionParams }>,
      reply: FastifyReply,
    ) => {
      const result = await positionService.delete(parseInt(request.params.id));
      if (result.affected === 0) {
        reply.status(404).send({ message: "职位不存在" });
        return;
      }
      return { message: "删除成功" };
    },
  );
}
