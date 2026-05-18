import 'reflect-metadata';
import fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AppDataSource } from './data-source';
import { examSessionRoutes } from './routes/examSession';
import { positionRoutes } from './routes/position';
import { scoreRoutes } from './routes/score';
import { userRoutes } from './routes/user';
import { analysisRoutes } from './routes/analysis';
import { reportRoutes } from './routes/report';

const app = fastify({ logger: true });

app.register(swagger, {
  openapi: {
    info: {
      title: '公考成绩分析与排名服务 API',
      description: '提供公考成绩管理、排名计算、数据分析等功能',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器'
      }
    ],
    tags: [
      { name: '考试场次', description: '考试场次管理' },
      { name: '职位', description: '职位管理' },
      { name: '成绩', description: '考生成绩管理' },
      { name: '用户', description: '用户管理' },
      { name: '分析', description: '数据分析功能' },
      { name: '成绩报告', description: '成绩报告生成与管理' }
    ]
  }
});

app.register(swaggerUi, {
  routePrefix: '/api/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

app.register(examSessionRoutes, { prefix: '/api/exam-sessions' });
app.register(positionRoutes, { prefix: '/api/positions' });
app.register(scoreRoutes, { prefix: '/api/scores' });
app.register(userRoutes, { prefix: '/api/users' });
app.register(analysisRoutes, { prefix: '/api/analysis' });
app.register(reportRoutes, { prefix: '/api/reports' });

async function start() {
  try {
    await AppDataSource.initialize();
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('服务器运行在 http://localhost:3000');
    console.log('Swagger 文档: http://localhost:3000/api/docs');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
