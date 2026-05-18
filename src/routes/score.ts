import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ScoreService } from '../services/ScoreService';

const scoreService = new ScoreService();

interface ScoreParams {
  id: string;
}

interface ScoreQuery {
  positionId?: string;
  examNumber?: string;
}

export async function scoreRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['成绩'],
      summary: '获取所有成绩',
      querystring: {
        type: 'object',
        properties: {
          positionId: { type: 'number' },
          examNumber: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: ScoreQuery }>) => {
    if (request.query.positionId) {
      const scores = await scoreService.findByPosition(parseInt(request.query.positionId));
      return scores.map((score, index) => ({ ...score, rank: index + 1 }));
    }
    if (request.query.examNumber) {
      const score = await scoreService.findByExamNumber(request.query.examNumber);
      return score ? [score] : [];
    }
    return scoreService.findAll();
  });

  fastify.get('/position/:id', {
    schema: {
      tags: ['成绩'],
      summary: '获取某个职位的所有成绩（含排名）',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: ScoreParams }>) => {
    const scores = await scoreService.findByPosition(parseInt(request.params.id));
    return scores.map((score, index) => ({ ...score, rank: index + 1 }));
  });

  fastify.get('/:id', {
    schema: {
      tags: ['成绩'],
      summary: '根据ID获取成绩',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: ScoreParams }>, reply: FastifyReply) => {
    const score = await scoreService.findById(parseInt(request.params.id));
    if (!score) {
      reply.status(404).send({ message: '成绩不存在' });
      return;
    }
    return score;
  });

  fastify.post('/', {
    schema: {
      tags: ['成绩'],
      summary: '创建成绩',
      body: {
        type: 'object',
        required: ['name', 'examNumber', 'xingceScore', 'shenlunScore', 'positionId'],
        properties: {
          name: { type: 'string' },
          examNumber: { type: 'string' },
          xingceScore: { type: 'number' },
          shenlunScore: { type: 'number' },
          interviewScore: { type: 'number' },
          positionId: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      return await scoreService.create(request.body);
    } catch (error: any) {
      reply.status(400).send({ message: error.message });
    }
  });

  fastify.put('/:id', {
    schema: {
      tags: ['成绩'],
      summary: '更新成绩',
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
          xingceScore: { type: 'number' },
          shenlunScore: { type: 'number' },
          interviewScore: { type: 'number' },
          positionId: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: ScoreParams; Body: any }>, reply: FastifyReply) => {
    try {
      const score = await scoreService.update(parseInt(request.params.id), request.body);
      if (!score) {
        reply.status(404).send({ message: '成绩不存在' });
        return;
      }
      return score;
    } catch (error: any) {
      reply.status(400).send({ message: error.message });
    }
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['成绩'],
      summary: '删除成绩',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: ScoreParams }>, reply: FastifyReply) => {
    const result = await scoreService.delete(parseInt(request.params.id));
    if (result.affected === 0) {
      reply.status(404).send({ message: '成绩不存在' });
      return;
    }
    return { message: '删除成功' };
  });

  fastify.post('/calculate-rank/:positionId', {
    schema: {
      tags: ['成绩'],
      summary: '计算职位排名',
      params: {
        type: 'object',
        properties: {
          positionId: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { positionId: string } }>, reply: FastifyReply) => {
    try {
      return await scoreService.calculateRankForPosition(parseInt(request.params.positionId));
    } catch (error: any) {
      reply.status(400).send({ message: error.message });
    }
  });

  fastify.post('/import', {
    schema: {
      tags: ['成绩'],
      summary: '批量导入成绩（CSV）',
      body: {
        type: 'object',
        required: ['csvData'],
        properties: {
          csvData: { type: 'string', description: 'CSV格式：准考证号,姓名,职位代码,行测,申论,面试' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { csvData: string } }>) => {
    return scoreService.bulkImport(request.body.csvData);
  });
}
