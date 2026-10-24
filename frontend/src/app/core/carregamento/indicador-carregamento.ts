import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { CarregamentoService } from './carregamento.service';

/** Atrasos para não "piscar" em respostas rápidas. */
export const ATRASO_BARRA_MS = 150;
export const ATRASO_TELA_MS = 1500;
export const ATRASO_AVISO_LENTO_MS = 6000;

/**
 * Indicador global, em camadas: barra fina no topo para esperas curtas; tela de carregamento
 * (quadrado da marca pulsando) para esperas longas; aviso de servidor acordando se demorar muito.
 */
@Component({
  selector: 'app-indicador-carregamento',
  template: `
    @if (barra()) {
      <div class="barra" role="progressbar" aria-label="Carregando"><span></span></div>
    }
    @if (tela()) {
      <div class="tela" role="status" aria-live="polite">
        <div class="marca" aria-hidden="true"></div>
        <p>Carregando…</p>
        @if (lento()) {
          <p class="aviso">O servidor pode estar acordando. Isso leva até um minuto na primeira vez.</p>
        }
      </div>
    }
  `,
  styleUrl: './indicador-carregamento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicadorCarregamento {
  protected readonly barra = signal(false);
  protected readonly tela = signal(false);
  protected readonly lento = signal(false);
  private temporizadores: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    const carregamento = inject(CarregamentoService);
    effect(() => (carregamento.ativo() ? this.agendar() : this.esconder()));
    inject(DestroyRef).onDestroy(() => this.limpar());
  }

  private agendar(): void {
    this.limpar();
    this.temporizadores = [
      setTimeout(() => this.barra.set(true), ATRASO_BARRA_MS),
      setTimeout(() => this.tela.set(true), ATRASO_TELA_MS),
      setTimeout(() => this.lento.set(true), ATRASO_AVISO_LENTO_MS),
    ];
  }

  private esconder(): void {
    this.limpar();
    this.barra.set(false);
    this.tela.set(false);
    this.lento.set(false);
  }

  private limpar(): void {
    this.temporizadores.forEach(clearTimeout);
    this.temporizadores = [];
  }
}
