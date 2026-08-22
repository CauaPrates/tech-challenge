import { Module } from '@nestjs/common';

import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxRepository } from './outbox.repository';

@Module({
  providers: [OutboxRepository, OutboxDispatcher],
  exports: [OutboxRepository],
})
export class OutboxModule {}
