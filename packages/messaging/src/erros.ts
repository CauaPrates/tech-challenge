/**
 * Falha que reentregar nao resolve: payload que nao passa no schema, referencia que nao existe,
 * transicao de estado proibida. Vai para a DLQ e o offset e confirmado, para uma mensagem
 * envenenada nao travar a particao.
 *
 * O contrario — banco fora, broker instavel, timeout — NAO deve usar esta classe: essas falhas
 * sao retentadas e, se persistirem, o offset nao e confirmado e o Kafka reentrega mais tarde.
 * Melhor um consumidor visivelmente parado do que uma mensagem silenciosamente descartada.
 */
export class ErroDefinitivo extends Error {
  constructor(
    message: string,
    readonly causa?: unknown,
  ) {
    super(message);
    this.name = 'ErroDefinitivo';
  }
}
