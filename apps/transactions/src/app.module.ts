import { KafkaModule } from '@challenge/messaging';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { validateEnv } from './config/env';
import { opcoesDoKafka } from './config/kafka';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // o .env vive na raiz do monorepo, para os tres apps lerem a mesma configuracao local
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    KafkaModule.forRootAsync({ inject: [ConfigService], useFactory: opcoesDoKafka }),
    PrismaModule,
    HealthModule,
    TransactionsModule,
  ],
})
export class AppModule {}
