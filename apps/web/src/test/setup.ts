import '@testing-library/jest-dom/vitest';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { servidor } from './servidor';

beforeAll(() => {
  servidor.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  servidor.resetHandlers();
});

afterAll(() => {
  servidor.close();
});
