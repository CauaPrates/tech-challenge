import { Module } from '@nestjs/common';

import { MessagingModule } from '../messaging/messaging.module';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxRepository } from './outbox.repository';

@Module({
  imports: [MessagingModule],
  providers: [OutboxRepository, OutboxDispatcher],
  exports: [OutboxRepository],
})
export class OutboxModule {}
