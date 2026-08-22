import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export interface EventoProcessado {
  consumer: string;
  eventId: string;
  eventName: string;
}

@Injectable()
export class ProcessedEventRepository {
  /**
   * Devolve false quando o evento ja foi processado por este consumidor.
   *
   * Usa ON CONFLICT DO NOTHING (o skipDuplicates do Prisma) em vez de capturar violacao de
   * unicidade: no Postgres, um erro dentro de uma transacao a aborta inteira, e aqui a intencao
   * e justamente seguir na mesma transacao para aplicar — ou nao aplicar — o efeito.
   *
   * O registro tem de acontecer na MESMA transacao do efeito. Separados, existiria uma janela
   * entre "marquei como processado" e "apliquei" na qual um crash perderia a atualizacao.
   */
  async registrar(tx: Prisma.TransactionClient, evento: EventoProcessado): Promise<boolean> {
    const { count } = await tx.processedEvent.createMany({
      data: [evento],
      skipDuplicates: true,
    });

    return count === 1;
  }
}
