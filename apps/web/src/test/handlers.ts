import { http, HttpResponse } from 'msw';

import { API_URL } from './render';

/**
 * Tipos e resumo são pano de fundo em quase todo teste de tela. Ficam aqui para cada teste
 * declarar só o que ele realmente está exercitando.
 */
export const TIPOS = [
  { id: 1, name: 'transferencia' },
  { id: 2, name: 'pagamento' },
  { id: 3, name: 'deposito' },
];

export function handlersDeApoio() {
  return [
    http.get(`${API_URL}/transactions/types`, () => HttpResponse.json(TIPOS)),
    http.get(`${API_URL}/transactions/summary`, () =>
      HttpResponse.json({
        total: 0,
        porStatus: { pendente: 0, aprovada: 0, rejeitada: 0 },
      }),
    ),
  ];
}
