/** Erro de dominio: a requisicao esta bem formada, mas o estado do sistema recusa a operacao. */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class TransactionNotFoundError extends DomainError {
  constructor(externalId: string) {
    super(`transacao ${externalId} nao encontrada`);
  }
}

export class TransactionTypeNotFoundError extends DomainError {
  constructor(transferTypeId: number) {
    super(`tipo de transferencia ${transferTypeId} nao existe`);
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(atual: string, proximo: string) {
    super(`transicao invalida de ${atual} para ${proximo}`);
  }
}
