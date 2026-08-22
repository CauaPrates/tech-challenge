import type { KafkaModuleOpcoes } from '@challenge/messaging';
import type { ConfigService } from '@nestjs/config';

import type { Env } from './env';

export function opcoesDoKafka(config: ConfigService<Env, true>): KafkaModuleOpcoes {
  return {
    clientId: config.get('KAFKA_CLIENT_ID', { infer: true }),
    brokers: config.get('KAFKA_BROKERS', { infer: true }),
  };
}
