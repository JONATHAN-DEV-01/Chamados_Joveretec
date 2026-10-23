import { of } from 'rxjs';
import { FabricaDeTransporte } from '../core/envio/envio-de-arquivo';
import { EventosDoTransporte, Transporte } from '../core/envio/transporte';
import { Anexo, EnvioAutorizado } from '../core/models/feed';

/** Transporte controlado pelo teste: ele decide quando há progresso, sucesso ou falha. */
export class TransporteFalso implements Transporte {
  inicios = 0;
  pausas = 0;

  constructor(readonly eventos: EventosDoTransporte, readonly envio: EnvioAutorizado['envio']) {}

  iniciar(): void {
    this.inicios++;
  }

  pausar(): void {
    this.pausas++;
  }
}

export function fabricaFalsa(): { fabrica: FabricaDeTransporte; criados: TransporteFalso[] } {
  const criados: TransporteFalso[] = [];
  const fabrica: FabricaDeTransporte = (_arquivo, envio, eventos) => {
    const transporte = new TransporteFalso(eventos, envio);
    criados.push(transporte);
    return transporte;
  };
  return { fabrica, criados };
}

export function anexo(id: number, nome = 'log.txt', status: Anexo['status'] = 'PENDENTE'): Anexo {
  return {
    id,
    nome,
    tipoMime: 'text/plain',
    tamanhoBytes: 10,
    status,
    enviadoPor: { id: 7, nome: 'Ana Dev' },
    criadoEm: '2026-10-23T12:00:00Z',
    podeExcluir: true,
  };
}

/** AnexoService falso com respostas imediatas e espiões. */
export function anexoServiceFalso(proximoId = 100) {
  let id = proximoId;
  return {
    solicitarEnvio: vi.fn((_chamadoId: number, pedido: { nome: string }) =>
      of<EnvioAutorizado>({
        anexo: anexo(id++, pedido.nome),
        envio: { protocolo: 'TUS', url: 'https://x/upload', cabecalhos: {}, metadados: {}, tamanhoParte: 6291456 },
      }),
    ),
    confirmar: vi.fn((anexoId: number) => of(anexo(anexoId, 'log.txt', 'CONCLUIDO'))),
    excluir: vi.fn(() => of(undefined)),
    linkDeDownload: vi.fn(() => of('https://x/download')),
  };
}

export function arquivo(nome = 'log.txt', conteudo = 'conteudo'): File {
  return new File([conteudo], nome, { type: 'text/plain' });
}
