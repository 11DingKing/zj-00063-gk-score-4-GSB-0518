import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReportService } from '../services/ReportService';

const reportService = new ReportService();

interface ReportParams {
  id: string;
}

interface ReportQuery {
  examNumber?: string;
  reportType?: string;
  page?: string;
  limit?: string;
}

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['成绩报告'],
      summary: '获取报告列表',
      querystring: {
        type: 'object',
        properties: {
          examNumber: { type: 'string', description: '准考证号' },
          reportType: { type: 'string', enum: ['personal', 'competition'], description: '报告类型' },
          page: { type: 'number', description: '页码' },
          limit: { type: 'number', description: '每页数量' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: ReportQuery }>) => {
    return reportService.findAll({
      examNumber: request.query.examNumber,
      reportType: request.query.reportType,
      page: request.query.page ? parseInt(request.query.page) : undefined,
      limit: request.query.limit ? parseInt(request.query.limit) : undefined,
    });
  });

  fastify.get('/:id', {
    schema: {
      tags: ['成绩报告'],
      summary: '根据ID获取报告详情',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: ReportParams }>, reply: FastifyReply) => {
    const report = await reportService.findById(parseInt(request.params.id));
    if (!report) {
      reply.status(404).send({ message: '报告不存在' });
      return;
    }
    return report;
  });

  fastify.post('/personal', {
    schema: {
      tags: ['成绩报告'],
      summary: '生成个人成绩分析报告',
      body: {
        type: 'object',
        required: ['examNumber'],
        properties: {
          examNumber: { type: 'string', description: '准考证号' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { examNumber: string } }>, reply: FastifyReply) => {
    try {
      return await reportService.createPersonalReport(request.body.examNumber);
    } catch (error: any) {
      reply.status(400).send({ message: error.message });
    }
  });

  fastify.post('/competition', {
    schema: {
      tags: ['成绩报告'],
      summary: '生成职位竞争力对比报告',
      body: {
        type: 'object',
        required: ['examNumber', 'targetPositionIds'],
        properties: {
          examNumber: { type: 'string', description: '准考证号' },
          targetPositionIds: {
            type: 'array',
            items: { type: 'number' },
            description: '目标职位ID列表',
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { examNumber: string; targetPositionIds: number[] } }>, reply: FastifyReply) => {
    try {
      return await reportService.createCompetitionReport(request.body.examNumber, request.body.targetPositionIds);
    } catch (error: any) {
      reply.status(400).send({ message: error.message });
    }
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['成绩报告'],
      summary: '删除报告',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: ReportParams }>, reply: FastifyReply) => {
    const result = await reportService.delete(parseInt(request.params.id));
    if (result.affected === 0) {
      reply.status(404).send({ message: '报告不存在' });
      return;
    }
    return { message: '删除成功' };
  });
}
