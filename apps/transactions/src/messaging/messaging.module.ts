import { Module } from '@nestjs/common';

import { KafkaProducer } from './kafka-producer';
import { KafkaTopics } from './kafka-topics';

@Module({
  providers: [KafkaProducer, KafkaTopics],
  exports: [KafkaProducer],
})
export class MessagingModule {}
