import '@testing-library/jest-dom/vitest';

import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { handlersDeApoio } from './handlers';
import { servidor } from './servidor';

beforeAll(() => {
  servidor.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  servidor.use(...handlersDeApoio());
});

afterEach(() => {
  servidor.resetHandlers();
});

afterAll(() => {
  servidor.close();
});
