import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /**
   * Liveness apenas: este servico nao tem banco, e a saude do Kafka nao pertence a ele — se o
   * broker estiver fora, o consumidor reagenda a assinatura e o servico continua valido.
   */
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
