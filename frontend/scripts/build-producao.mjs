// Build de produção: lê API_URL do ambiente (Vercel/CI) e injeta no bundle via `--define`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const apiUrl = (process.env.API_URL ?? '').trim().replace(/\/+$/, '');

if (!/^https?:\/\/.+/.test(apiUrl)) {
  console.error('Defina a variável de ambiente API_URL (ex.: https://chamados-api.onrender.com).');
  process.exit(1);
}

// Executa o CLI do Angular direto no Node (sem shell), para o valor chegar intacto em qualquer SO.
const cliAngular = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));

console.log(`Build de produção com API_URL=${apiUrl}`);
const resultado = spawnSync(
  process.execPath,
  [cliAngular, 'build', '--configuration', 'production', '--define', `API_URL=${JSON.stringify(apiUrl)}`],
  { stdio: 'inherit' },
);
process.exit(resultado.status ?? 1);
