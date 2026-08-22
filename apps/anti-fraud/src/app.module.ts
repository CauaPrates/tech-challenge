import { KafkaModule } from '@challenge/messaging';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { validateEnv } from './config/env';
import { opcoesDoKafka } from './config/kafka';
import { FraudModule } from './fraud/fraud.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    KafkaModule.forRootAsync({ inject: [ConfigService], useFactory: opcoesDoKafka }),
    HealthModule,
    FraudModule,
  ],
})
export class AppModule {}
