import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExamSessionService } from '../services/ExamSessionService';

const examSessionService = new ExamSessionService();

interface ExamSessionParams {
  id: string;
}

export async function examSessionRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['考试场次'],
      summary: '获取所有考试场次',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              examType: { type: 'string' },
              subjectConfig: { type: 'object' },
              interviewFullScore: { type: 'number' },
              totalScoreFormula: { type: 'string' }
            }
          }
        }
      }
    }
  }, async () => {
    return examSessionService.findAll();
  });

  fastify.get('/:id', {
    schema: {
      tags: ['考试场次'],
      summary: '根据ID获取考试场次',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: ExamSessionParams }>, reply: FastifyReply) => {
    const examSession = await examSessionService.findById(parseInt(request.params.id));
    if (!examSession) {
      reply.status(404).send({ message: '考试场次不存在' });
      return;
    }
    return examSession;
  });

  fastify.post('/', {
    schema: {
      tags: ['考试场次'],
      summary: '创建考试场次',
      body: {
        type: 'object',
        required: ['name', 'examType', 'subjectConfig', 'interviewFullScore', 'totalScoreFormula'],
        properties: {
          name: { type: 'string' },
          examType: { type: 'string', enum: ['国考', '省考', '选调', '事业编'] },
          subjectConfig: {
            type: 'object',
            properties: {
              xingce: { type: 'object', properties: { fullScore: { type: 'number' } } },
              shenlun: { type: 'object', properties: { fullScore: { type: 'number' } } }
            }
          },
          interviewFullScore: { type: 'number' },
          totalScoreFormula: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: Partial<any> }>) => {
    return examSessionService.create(request.body);
  });

  fastify.put('/:id', {
    schema: {
      tags: ['考试场次'],
      summary: '更新考试场次',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          examType: { type: 'string' },
          subjectConfig: { type: 'object' },
          interviewFullScore: { type: 'number' },
          totalScoreFormula: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: ExamSessionParams; Body: Partial<any> }>, reply: FastifyReply) => {
    const examSession = await examSessionService.update(parseInt(request.params.id), request.body);
    if (!examSession) {
      reply.status(404).send({ message: '考试场次不存在' });
      return;
    }
    return examSession;
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['考试场次'],
      summary: '删除考试场次',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: ExamSessionParams }>, reply: FastifyReply) => {
    const result = await examSessionService.delete(parseInt(request.params.id));
    if (result.affected === 0) {
      reply.status(404).send({ message: '考试场次不存在' });
      return;
    }
    return { message: '删除成功' };
  });
}
