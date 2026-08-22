import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Traduz falha de schema em 400 com um item por campo. O front usa esses itens para posicionar
 * a mensagem no campo certo do formulario, em vez de exibir um texto generico.
 */
@Injectable()
export class ZodValidationPipe<TSaida> implements PipeTransform<unknown, TSaida> {
  constructor(private readonly schema: ZodType<TSaida>) {}

  transform(valor: unknown): TSaida {
    const resultado = this.schema.safeParse(valor);

    if (!resultado.success) {
      throw new BadRequestException({
        error: 'ValidationError',
        message: 'requisicao invalida',
        details: resultado.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return resultado.data;
  }
}
