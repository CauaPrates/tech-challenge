import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // o pacote de contratos e TypeScript compilado no monorepo, nao um pacote publicado
  transpilePackages: ['@challenge/contracts'],
};

export default config;
