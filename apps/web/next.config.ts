import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const AQUI = dirname(fileURLToPath(import.meta.url));

/**
 * O Next le o .env da pasta do app, mas neste monorepo ele vive na raiz — o mesmo arquivo que os
 * dois servicos NestJS usam. Sem isto, NEXT_PUBLIC_API_URL seria silenciosamente ignorado e a
 * tela cairia no valor embutido no codigo, o que contraria "configuracao vem do ambiente".
 */
function carregarEnvDaRaiz(): Record<string, string> {
  const publicas: Record<string, string> = {};

  try {
    const conteudo = readFileSync(resolve(AQUI, '../../.env'), 'utf8');

    for (const linha of conteudo.split('\n')) {
      const encontrado = /^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha);

      if (encontrado?.[1] !== undefined && encontrado[2] !== undefined) {
        // variavel do ambiente do processo tem precedencia sobre o arquivo
        publicas[encontrado[1]] = process.env[encontrado[1]] ?? encontrado[2].trim();
      }
    }
  } catch {
    // sem .env na raiz o app usa os padroes; nao e motivo para falhar o build
  }

  return publicas;
}

const config: NextConfig = {
  reactStrictMode: true,
  // o pacote de contratos e TypeScript compilado no monorepo, nao um pacote publicado
  transpilePackages: ['@challenge/contracts'],
  env: carregarEnvDaRaiz(),
};

export default config;
