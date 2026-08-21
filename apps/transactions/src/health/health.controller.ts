import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica o banco, e nao so se o processo respondeu: health que sempre devolve ok nao
   * distingue "servico pronto" de "servico de pe sem conseguir trabalhar".
   */
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('banco de dados indisponivel');
    }

    return { status: 'ok' };
  }
}
