import { Signal, computed, signal } from '@angular/core';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { ApiErro } from '../api/api-erro';
import { AnexoService } from '../api/anexo.service';
import { Anexo } from '../models/feed';
import { Transporte, criarTransporte } from './transporte';

export type EstadoEnvio = 'aguardando' | 'preparando' | 'enviando' | 'pausado' | 'confirmando' | 'concluido' | 'erro';

/**
 * Para onde vai o anexo: abertura do chamado (acompanhamentoId null), rascunho de acompanhamento
 * ou, com chamadoId null, rascunho de um chamado ainda sendo escrito.
 */
export interface DestinoDoEnvio {
  chamadoId: number | null;
  acompanhamentoId: number | null;
}

export type FabricaDeTransporte = typeof criarTransporte;

/**
 * Ciclo de vida de um arquivo: pedir autorização ao backend → enviar direto ao armazenamento
 * (com progresso, pausa e retomada) → confirmar no backend.
 */
export class EnvioDeArquivo {
  private readonly _estado = signal<EstadoEnvio>('aguardando');
  private readonly _progresso = signal(0);
  private readonly _erro = signal<string | null>(null);
  private readonly _anexo = signal<Anexo | null>(null);
  private transporte: Transporte | null = null;
  private destino: Observable<DestinoDoEnvio> | null = null;
  /** O arquivo já chegou ao armazenamento; falta só confirmar no backend. */
  private enviado = false;

  readonly estado: Signal<EstadoEnvio> = this._estado.asReadonly();
  /** 0 a 1. */
  readonly progresso: Signal<number> = this._progresso.asReadonly();
  readonly erro = this._erro.asReadonly();
  readonly anexo = this._anexo.asReadonly();
  readonly concluido = computed(() => this._estado() === 'concluido');
  /** Ainda não terminou (inclui pausado): bloqueia publicação e saída da página. */
  readonly pendente = computed(() => !['concluido', 'erro', 'aguardando'].includes(this._estado()));

  constructor(
    readonly arquivo: File,
    private readonly anexos: AnexoService,
    private readonly fabrica: FabricaDeTransporte = criarTransporte,
  ) {}

  iniciar(destino: Observable<DestinoDoEnvio>): void {
    if (this._estado() !== 'aguardando' && this._estado() !== 'erro') {
      return;
    }
    if (this.transporte) {
      this.retomar();
      return;
    }
    this.destino = destino;
    this._erro.set(null);
    this._estado.set('preparando');
    destino
      .pipe(
        switchMap(({ chamadoId, acompanhamentoId }) =>
          this.anexos.solicitarEnvio(chamadoId, {
            nome: this.arquivo.name,
            tipoMime: this.arquivo.type || 'application/octet-stream',
            tamanhoBytes: this.arquivo.size,
            acompanhamentoId,
          }),
        ),
      )
      .subscribe({
        next: ({ anexo, envio }) => {
          this._anexo.set(anexo);
          this.transporte = this.fabrica(this.arquivo, envio, {
            progresso: (enviados, total) => this._progresso.set(total ? enviados / total : 0),
            sucesso: () => this.confirmar(),
            falha: (mensagem) => this.falhar(mensagem),
          });
          this.enviar();
        },
        error: (erro: unknown) => this.falhar(ApiErro.mensagemDe(erro)),
      });
  }

  /** Interrompe o envio; `retomar` continua de onde parou (TUS) ou reenvia (envio simples). */
  cancelar(): void {
    if (this._estado() === 'enviando') {
      this.transporte?.pausar();
      this._estado.set('pausado');
    }
  }

  retomar(): void {
    if (this._estado() !== 'pausado' && this._estado() !== 'erro') {
      return;
    }
    if (!this.transporte) {
      // A falha foi antes do envio (ex.: na autorização): pede de novo.
      this._estado.set('aguardando');
      this.iniciar(this.destino!);
      return;
    }
    this._erro.set(null);
    if (this.enviado) {
      this.confirmar();
    } else {
      this.enviar();
    }
  }

  /** Interrompe e descarta o anexo no backend (o arquivo parcial é limpo pela rotina de pendentes). */
  remover(): Observable<void> {
    this.transporte?.pausar();
    const anexo = this._anexo();
    return anexo ? this.anexos.excluir(anexo.id).pipe(catchError(() => of(undefined))) : of(undefined);
  }

  private enviar(): void {
    this._estado.set('enviando');
    this.transporte?.iniciar();
  }

  private confirmar(): void {
    this.enviado = true;
    this._progresso.set(1);
    this._estado.set('confirmando');
    this.anexos.confirmar(this._anexo()!.id).subscribe({
      next: (anexo) => {
        this._anexo.set(anexo);
        this._estado.set('concluido');
      },
      error: (erro: unknown) => this.falhar(ApiErro.mensagemDe(erro)),
    });
  }

  private falhar(mensagem: string): void {
    // Erros que chegam depois de uma pausa (abort) não interessam ao usuário.
    if (this._estado() === 'pausado') {
      return;
    }
    this._erro.set(mensagem);
    this._estado.set('erro');
  }
}
