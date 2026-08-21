import { describe, expect, it } from 'vitest';

import { EVENT_ID_NAMESPACE, statusUpdatedEventId, uuidV5 } from './event-id';

const NAMESPACE_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const EXTERNAL_ID = '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33';

describe('uuidV5', () => {
  it('reproduz o vetor publicado da RFC 4122 para o namespace DNS', () => {
    expect(uuidV5('example.com', NAMESPACE_DNS)).toBe('cfbff0d1-9375-5685-968c-48ce8b15ae17');
  });

  it('marca versao 5 e variante RFC 4122 nos nibbles corretos', () => {
    const id = uuidV5('qualquer-nome', EVENT_ID_NAMESPACE);

    expect(id[14]).toBe('5');
    expect(['8', '9', 'a', 'b']).toContain(id[19]);
  });

  it('preserva os bytes de acentuacao ao derivar', () => {
    expect(uuidV5('ção', EVENT_ID_NAMESPACE)).not.toBe(uuidV5('cao', EVENT_ID_NAMESPACE));
  });
});

describe('statusUpdatedEventId', () => {
  it('e deterministico: a mesma transacao gera sempre o mesmo eventId', () => {
    // e o que permite o anti-fraud reprocessar sem banco
    expect(statusUpdatedEventId(EXTERNAL_ID)).toBe(statusUpdatedEventId(EXTERNAL_ID));
  });

  it('gera eventId distinto para transacoes distintas', () => {
    const outro = '0f8fad5b-d9cb-469f-a165-70867728950e';

    expect(statusUpdatedEventId(EXTERNAL_ID)).not.toBe(statusUpdatedEventId(outro));
  });

  it('nao colide com o eventId de outro nome derivado da mesma transacao', () => {
    expect(statusUpdatedEventId(EXTERNAL_ID)).not.toBe(uuidV5(EXTERNAL_ID, EVENT_ID_NAMESPACE));
  });
});
