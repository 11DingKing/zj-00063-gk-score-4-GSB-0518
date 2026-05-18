import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';

const userService = new UserService();

interface UserParams {
  id: string;
}

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['用户'],
      summary: '获取所有用户'
    }
  }, async () => {
    return userService.findAll();
  });

  fastify.get('/:id', {
    schema: {
      tags: ['用户'],
      summary: '根据ID获取用户',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply) => {
    const user = await userService.findById(parseInt(request.params.id));
    if (!user) {
      reply.status(404).send({ message: '用户不存在' });
      return;
    }
    return user;
  });

  fastify.post('/', {
    schema: {
      tags: ['用户'],
      summary: '创建用户',
      body: {
        type: 'object',
        required: ['username', 'password', 'role'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
          role: { type: 'string', enum: ['Admin', 'Analyst'] }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>) => {
    return userService.create(request.body);
  });

  fastify.put('/:id', {
    schema: {
      tags: ['用户'],
      summary: '更新用户',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
          role: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: UserParams; Body: any }>, reply: FastifyReply) => {
    const user = await userService.update(parseInt(request.params.id), request.body);
    if (!user) {
      reply.status(404).send({ message: '用户不存在' });
      return;
    }
    return user;
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['用户'],
      summary: '删除用户',
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply) => {
    const result = await userService.delete(parseInt(request.params.id));
    if (result.affected === 0) {
      reply.status(404).send({ message: '用户不存在' });
      return;
    }
    return { message: '删除成功' };
  });
}
