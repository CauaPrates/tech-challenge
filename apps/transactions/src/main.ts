import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // sem isto, onModuleDestroy nao roda em SIGTERM e a conexao do Prisma fica pendurada
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(config.get('TRANSACTIONS_PORT', { infer: true }));
}

void bootstrap();
