import { Module } from '@nestjs/common';

import { ProcessedEventRepository } from '../messaging/processed-event.repository';
import { OutboxModule } from '../outbox/outbox.module';
import { StatusUpdatedConsumer } from './status-updated.consumer';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [OutboxModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsRepository,
    ProcessedEventRepository,
    StatusUpdatedConsumer,
  ],
})
export class TransactionsModule {}
