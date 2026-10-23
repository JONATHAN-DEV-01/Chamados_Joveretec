// Build de produção: lê API_URL do ambiente (Vercel/CI) e injeta no bundle via `--define`.
import { spawnSync } from 'node:child_process';

const apiUrl = (process.env.API_URL ?? '').trim().replace(/\/+$/, '');

if (!/^https?:\/\/.+/.test(apiUrl)) {
  console.error('Defina a variável de ambiente API_URL (ex.: https://chamados-api.onrender.com).');
  process.exit(1);
}

console.log(`Build de produção com API_URL=${apiUrl}`);
const resultado = spawnSync(
  'npx',
  ['ng', 'build', '--configuration', 'production', '--define', `API_URL=${JSON.stringify(apiUrl)}`],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(resultado.status ?? 1);
