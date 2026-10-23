import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { EnvioDeArquivo, EstadoEnvio } from '../../core/envio/envio-de-arquivo';
import { FilaDeEnvios } from '../../core/envio/fila-de-envios';
import { TamanhoPipe, iconeDoArquivo } from '../formatos';

const ROTULO_ESTADO: Record<EstadoEnvio, string> = {
  aguardando: 'Aguardando',
  preparando: 'Preparando…',
  enviando: 'Enviando',
  pausado: 'Pausado',
  confirmando: 'Finalizando…',
  concluido: 'Enviado',
  erro: 'Falhou',
};

/** Seleção (botão ou arrastar e soltar) e progresso dos arquivos de uma {@link FilaDeEnvios}. */
@Component({
  selector: 'app-area-de-anexos',
  imports: [TamanhoPipe],
  templateUrl: './area-de-anexos.html',
  styleUrl: './area-de-anexos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaDeAnexos {
  readonly fila = input.required<FilaDeEnvios>();
  readonly desabilitada = input(false);
  /** id único do input de arquivo (há mais de uma área por página). */
  readonly idCampo = input('anexos');

  protected readonly arrastando = signal(false);
  protected readonly ROTULO_ESTADO = ROTULO_ESTADO;

  protected selecionar(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    if (campo.files?.length) {
      this.fila().adicionar(campo.files);
    }
    campo.value = ''; // permite escolher o mesmo arquivo de novo
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(false);
    const arquivos = evento.dataTransfer?.files;
    if (arquivos?.length && !this.desabilitada()) {
      this.fila().adicionar(arquivos);
    }
  }

  protected sobre(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(!this.desabilitada());
  }

  protected icone(envio: EnvioDeArquivo): string {
    return iconeDoArquivo(envio.arquivo.type, envio.arquivo.name);
  }

  protected percentual(envio: EnvioDeArquivo): number {
    return Math.round(envio.progresso() * 100);
  }
}
