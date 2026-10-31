import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

/** Progresso dos arquivos de uma {@link FilaDeEnvios}: cancelar, retomar e remover. */
@Component({
  selector: 'app-lista-de-envios',
  imports: [TamanhoPipe],
  templateUrl: './lista-de-envios.html',
  styleUrl: './lista-de-envios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaDeEnvios {
  readonly fila = input.required<FilaDeEnvios>();
  /** Quem usa a lista decide o que remover junto (ex.: a referência no texto). */
  readonly remover = output<EnvioDeArquivo>();

  protected readonly ROTULO_ESTADO = ROTULO_ESTADO;

  protected icone(envio: EnvioDeArquivo): string {
    return iconeDoArquivo(envio.arquivo.type, envio.arquivo.name);
  }

  protected percentual(envio: EnvioDeArquivo): number {
    return Math.round(envio.progresso() * 100);
  }
}
