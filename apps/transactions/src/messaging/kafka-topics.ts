import { deadLetterTopic, TOPICS } from '@challenge/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';

import type { Env } from '../config/env';

const PARTICOES_POR_TOPICO = 3;

/**
 * Cria os topicos explicitamente em vez de depender do auto.create.topics.enable: criacao
 * automatica usa a contagem de particoes padrao e transforma erro de digitacao no nome do
 * topico em topico novo, silenciosamente.
 *
 * Nao roda na subida do modulo, e sim antes da primeira publicacao. Broker indisponivel nao
 * pode impedir a API de aceitar criacao de transacao — e justamente para isso que o outbox
 * existe.
 */
@Injectable()
export class KafkaTopics {
  private readonly logger = new Logger(KafkaTopics.name);
  private readonly kafka: Kafka;
  private garantidos = false;

  constructor(config: ConfigService<Env, true>) {
    this.kafka = new Kafka({
      clientId: `${config.get('KAFKA_CLIENT_ID', { infer: true })}-admin`,
      brokers: config.get('KAFKA_BROKERS', { infer: true }),
      retry: { retries: 1, initialRetryTime: 100 },
      connectionTimeout: 3000,
    });
  }

  async garantir(): Promise<void> {
    if (this.garantidos) {
      return;
    }

    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const criados = await admin.createTopics({
        topics: [
          { topic: TOPICS.transactionCreated, numPartitions: PARTICOES_POR_TOPICO },
          { topic: TOPICS.transactionStatusUpdated, numPartitions: PARTICOES_POR_TOPICO },
          { topic: deadLetterTopic(TOPICS.transactionCreated), numPartitions: 1 },
          { topic: deadLetterTopic(TOPICS.transactionStatusUpdated), numPartitions: 1 },
        ],
      });

      this.garantidos = true;
      this.logger.log(criados ? 'topicos criados' : 'topicos ja existiam');
    } finally {
      await admin.disconnect();
    }
  }
}
