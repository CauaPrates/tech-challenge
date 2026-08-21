import { z } from 'zod';

const DECIMAL_WITH_TWO_PLACES = /^\d+(\.\d{1,2})?$/;

/**
 * Valor monetario em transito viaja como string decimal, nunca como number. E a unica forma de
 * o numeric(18,2) do Postgres chegar ao outro servico sem passar por ponto flutuante binario no
 * meio do caminho — que e como o limite de 1000 viraria um bug de um centavo.
 */
export const decimalStringSchema = z
  .string()
  .regex(DECIMAL_WITH_TWO_PLACES, 'deve ser um decimal com no maximo duas casas')
  .refine((value) => Number(value) > 0, 'deve ser maior que zero');

/** Na borda HTTP o contrato do desafio usa number, entao a validacao das casas e feita aqui. */
export const monetaryNumberSchema = z
  .number()
  .positive('deve ser maior que zero')
  .refine(
    (value) => DECIMAL_WITH_TWO_PLACES.test(value.toString()),
    'deve ter no maximo duas casas decimais',
  );
