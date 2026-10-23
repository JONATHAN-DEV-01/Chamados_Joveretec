import { DestroyRef, InjectionToken, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AnexoService } from '../api/anexo.service';
import { DestinoDoEnvio, EnvioDeArquivo, FabricaDeTransporte } from './envio-de-arquivo';
import { EnviosAtivos } from './envios-ativos';
import { criarTransporte } from './transporte';

/**
 * Arquivos de um formulário (acompanhamento ou novo chamado). Com `destino` definido, cada
 * arquivo começa a ser enviado assim que é adicionado; sem ele, espera `iniciarTodos`.
 */
export class FilaDeEnvios {
  private readonly _envios = signal<EnvioDeArquivo[]>([]);
  readonly envios = this._envios.asReadonly();

  readonly vazia = computed(() => this._envios().length === 0);
  readonly pendente = computed(() => this._envios().some((e) => e.pendente()));
  readonly comErro = computed(() => this._envios().some((e) => e.estado() === 'erro'));
  readonly prontos = computed(() => this._envios().every((e) => e.concluido()));

  constructor(
    private readonly anexos: AnexoService,
    private destino: (() => Observable<DestinoDoEnvio>) | null,
    private readonly fabrica: FabricaDeTransporte = criarTransporte,
  ) {}

  adicionar(arquivos: Iterable<File>): void {
    const novos = Array.from(arquivos, (arquivo) => new EnvioDeArquivo(arquivo, this.anexos, this.fabrica));
    this._envios.update((atuais) => [...atuais, ...novos]);
    if (this.destino) {
      novos.forEach((envio) => envio.iniciar(this.destino!()));
    }
  }

  /** Define o destino (ex.: o chamado recém-criado) e envia o que estava aguardando. */
  iniciarTodos(destino: () => Observable<DestinoDoEnvio>): void {
    this.destino = destino;
    this._envios().forEach((envio) => envio.iniciar(destino()));
  }

  remover(envio: EnvioDeArquivo): void {
    envio.remover().subscribe();
    this._envios.update((atuais) => atuais.filter((e) => e !== envio));
  }

  /** Esvazia sem excluir os anexos (usado depois de publicar). */
  limpar(): void {
    this._envios.set([]);
  }
}

/** Como os arquivos são enviados (substituível nos testes). */
export const FABRICA_DE_TRANSPORTE = new InjectionToken<FabricaDeTransporte>('FABRICA_DE_TRANSPORTE', {
  providedIn: 'root',
  factory: () => criarTransporte,
});

/** Atalho para componentes: `fila = filaDeEnvios(() => destino$)`. Precisa de contexto de injeção. */
export function filaDeEnvios(destino: (() => Observable<DestinoDoEnvio>) | null = null): FilaDeEnvios {
  const fila = new FilaDeEnvios(inject(AnexoService), destino, inject(FABRICA_DE_TRANSPORTE));
  inject(DestroyRef).onDestroy(inject(EnviosAtivos).registrar(fila));
  return fila;
}
