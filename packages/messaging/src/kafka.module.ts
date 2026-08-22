import type { Abstract, DynamicModule, Type } from '@nestjs/common';
import { Module } from '@nestjs/common';

import { KafkaConsumerRunner } from './kafka-consumer';
import { KafkaProducer } from './kafka-producer';
import { KafkaTopics } from './kafka-topics';
import { KAFKA_OPCOES, type KafkaOpcoes, OPCOES_PADRAO } from './opcoes';

export interface KafkaModuleOpcoes {
  clientId: string;
  brokers: string[];
  maxTentativas?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  reconexaoMs?: number;
}

export interface KafkaModuleOpcoesAsync {
  inject?: readonly (string | symbol | Type | Abstract<unknown>)[];
  useFactory: (...dependencias: never[]) => KafkaModuleOpcoes | Promise<KafkaModuleOpcoes>;
}

const PROVIDERS = [KafkaTopics, KafkaProducer, KafkaConsumerRunner];
const EXPORTS = [KafkaProducer, KafkaConsumerRunner];

/**
 * Recebe a configuracao pronta em vez de ler o ambiente: o pacote nao conhece o schema de env
 * de nenhum app, entao cada servico valida o proprio ambiente e passa o resultado aqui.
 */
@Module({})
export class KafkaModule {
  static forRoot(opcoes: KafkaModuleOpcoes): DynamicModule {
    const resolvidas: KafkaOpcoes = { ...OPCOES_PADRAO, ...opcoes };

    return {
      module: KafkaModule,
      global: true,
      providers: [{ provide: KAFKA_OPCOES, useValue: resolvidas }, ...PROVIDERS],
      exports: EXPORTS,
    };
  }

  /** Para quando as opcoes vem de um provider, tipicamente o ConfigService validado do app. */
  static forRootAsync(opcoes: KafkaModuleOpcoesAsync): DynamicModule {
    return {
      module: KafkaModule,
      global: true,
      providers: [
        {
          provide: KAFKA_OPCOES,
          inject: opcoes.inject === undefined ? [] : [...opcoes.inject],
          useFactory: async (...dependencias: never[]): Promise<KafkaOpcoes> => ({
            ...OPCOES_PADRAO,
            ...(await opcoes.useFactory(...dependencias)),
          }),
        },
        ...PROVIDERS,
      ],
      exports: EXPORTS,
    };
  }
}
