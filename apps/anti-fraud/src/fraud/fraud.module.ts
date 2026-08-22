import { Module } from '@nestjs/common';

import { TransactionCreatedConsumer } from './transaction-created.consumer';

@Module({
  providers: [TransactionCreatedConsumer],
})
export class FraudModule {}
