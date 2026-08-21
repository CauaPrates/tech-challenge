import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  DomainError,
  InvalidStatusTransitionError,
  TransactionNotFoundError,
  TransactionTypeNotFoundError,
} from './errors';

/**
 * Erro de dominio virando codigo HTTP num lugar so. 422 e nao 404 para tipo inexistente porque
 * o corpo esta bem formado — o que nao resolve e a referencia que ele aponta.
 */
function statusPara(erro: DomainError): HttpStatus {
  if (erro instanceof TransactionNotFoundError) {
    return HttpStatus.NOT_FOUND;
  }

  if (erro instanceof TransactionTypeNotFoundError) {
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }

  if (erro instanceof InvalidStatusTransitionError) {
    return HttpStatus.CONFLICT;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(erro: DomainError, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const requisicao = contexto.getRequest<Request>();
    const resposta = contexto.getResponse<Response>();
    const status = statusPara(erro);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`erro de dominio nao mapeado: ${erro.name}`, erro.stack);
    }

    resposta.status(status).json({
      statusCode: status,
      error: erro.name,
      message: erro.message,
      timestamp: new Date().toISOString(),
      path: requisicao.url,
    });
  }
}
