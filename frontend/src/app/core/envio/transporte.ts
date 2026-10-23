import { DetailedError, Upload } from 'tus-js-client';
import { urlAbsoluta } from '../api/anexo.service';
import { EnvioAutorizado } from '../models/feed';

export interface EventosDoTransporte {
  progresso(enviados: number, total: number): void;
  sucesso(): void;
  falha(mensagem: string): void;
}

/** Envio de um arquivo direto ao armazenamento; `pausar` interrompe e `iniciar` retoma. */
export interface Transporte {
  iniciar(): void;
  pausar(): void;
}

export const MENSAGEM_LIMITE =
  'O arquivo é maior que o limite permitido pelo armazenamento (configurado no Supabase Storage).';

/** TUS (Supabase, resumível) ou PUT simples (armazenamento local de desenvolvimento). */
export function criarTransporte(arquivo: File, envio: EnvioAutorizado['envio'], eventos: EventosDoTransporte): Transporte {
  return envio.protocolo === 'TUS' ? transporteTus(arquivo, envio, eventos) : transportePut(arquivo, envio, eventos);
}

function transporteTus(arquivo: File, envio: EnvioAutorizado['envio'], eventos: EventosDoTransporte): Transporte {
  const upload = new Upload(arquivo, {
    endpoint: envio.url,
    headers: envio.cabecalhos,
    metadata: envio.metadados,
    chunkSize: envio.tamanhoParte || undefined,
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    retryDelays: [0, 1000, 3000, 5000],
    onProgress: (enviados, total) => eventos.progresso(enviados, total),
    onSuccess: () => eventos.sucesso(),
    onError: (erro) => eventos.falha(mensagemDoTus(erro)),
  });
  // Depois de abort(), start() continua do último byte aceito pelo servidor (upload.url é mantido).
  return { iniciar: () => upload.start(), pausar: () => void upload.abort() };
}

function transportePut(arquivo: File, envio: EnvioAutorizado['envio'], eventos: EventosDoTransporte): Transporte {
  let xhr: XMLHttpRequest | null = null;
  return {
    iniciar: () => {
      xhr = new XMLHttpRequest();
      xhr.open('PUT', urlAbsoluta(envio.url));
      Object.entries(envio.cabecalhos).forEach(([nome, valor]) => xhr!.setRequestHeader(nome, valor));
      xhr.upload.onprogress = (e) => e.lengthComputable && eventos.progresso(e.loaded, e.total);
      xhr.onload = () =>
        xhr!.status >= 200 && xhr!.status < 300 ? eventos.sucesso() : eventos.falha(mensagemDoStatus(xhr!.status, ''));
      xhr.onerror = () => eventos.falha(mensagemDoStatus(0, ''));
      xhr.send(arquivo);
    },
    pausar: () => xhr?.abort(),
  };
}

function mensagemDoTus(erro: Error | DetailedError): string {
  const resposta = erro instanceof DetailedError ? erro.originalResponse : null;
  return resposta ? mensagemDoStatus(resposta.getStatus(), resposta.getBody() ?? '') : mensagemDoStatus(0, erro.message);
}

/** Mensagem clara para o usuário, em especial quando o Storage recusa pelo tamanho. */
export function mensagemDoStatus(status: number, corpo: string): string {
  if (status === 413 || /too large|maximum allowed size|exceeded the maximum/i.test(corpo)) {
    return MENSAGEM_LIMITE;
  }
  if (status === 0) {
    return 'Falha de conexão durante o envio. Use "Retomar" para continuar.';
  }
  if (status === 401 || status === 403) {
    return 'A autorização de envio expirou ou foi recusada. Remova o arquivo e anexe novamente.';
  }
  return `O armazenamento recusou o envio (HTTP ${status}). Tente novamente.`;
}
