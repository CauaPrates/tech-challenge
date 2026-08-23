import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    // intervalo curto no teste: o comportamento medido e 'volta a buscar', nao 'espera 3s'
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:3001', NEXT_PUBLIC_POLL_INTERVAL_MS: '50' },
  },
});
