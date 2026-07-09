import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { createServer } from 'net';
import { AppModule } from './app.module';

async function getAvailablePort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(getAvailablePort(port + 1));
        return;
      }
      reject(error);
    });
    server.once('listening', () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : port));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Camunda External History Archive API')
    .setDescription(
      'Workflow monitoring, external history archive, analytics, and re-sync APIs for Camunda 7. Archive moves history rows from Camunda history tables into archive tables; re-sync moves archived history rows back into Camunda history tables.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const requestedPort = Number(config.get<number>('API_PORT') ?? process.env.PORT ?? 3000);
  const port = await getAvailablePort(requestedPort);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on port ${port}`);
}

void bootstrap();
