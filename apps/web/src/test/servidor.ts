import { setupServer } from 'msw/node';

/** Sem handler padrao: cada teste declara o que a API responde, e o resto e erro explicito. */
export const servidor = setupServer();
