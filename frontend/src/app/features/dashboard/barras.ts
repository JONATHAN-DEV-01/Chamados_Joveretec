import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Barra {
  rotulo: string;
  valor: number;
  /** Cor da marca (CSS); o texto continua nas cores de texto. */
  cor: string;
  /** Query params para abrir a lista de chamados já filtrada. */
  filtro?: Record<string, string | number>;
}

/**
 * Barras horizontais de uma série: rótulo, barra e valor sempre visíveis
 * (a própria lista serve de "visão em tabela"; a cor nunca é a única informação).
 */
@Component({
  selector: 'app-barras',
  imports: [RouterLink],
  template: `
    <ul class="barras">
      @for (barra of barras(); track barra.rotulo) {
        <li [title]="barra.rotulo + ': ' + barra.valor + ' (' + percentual(barra.valor) + '%)'">
          @if (barra.filtro) {
            <a class="rotulo-barra" routerLink="/chamados" [queryParams]="barra.filtro">{{ barra.rotulo }}</a>
          } @else {
            <span class="rotulo-barra">{{ barra.rotulo }}</span>
          }
          <span class="trilho" aria-hidden="true">
            @if (barra.valor > 0) {
              <span class="marca" [style.width.%]="largura(barra.valor)" [style.background]="barra.cor"></span>
            }
          </span>
          <span class="valor">{{ barra.valor }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    .barras { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
    li { display: grid; grid-template-columns: minmax(90px, 140px) minmax(0, 1fr) 3ch; gap: 12px; align-items: center; }
    .rotulo-barra { color: var(--cor-texto); font-size: 0.9rem; }
    .trilho { height: 12px; border-radius: 4px; background: color-mix(in srgb, var(--cor-superficie) 30%, transparent); }
    .marca { display: block; height: 100%; min-width: 2px; border-radius: 4px; }
    .valor { font-variant-numeric: tabular-nums; font-weight: 600; text-align: right; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Barras {
  readonly barras = input.required<Barra[]>();

  private readonly maximo = computed(() => Math.max(1, ...this.barras().map((b) => b.valor)));
  private readonly total = computed(() => this.barras().reduce((soma, b) => soma + b.valor, 0));

  protected largura(valor: number): number {
    return (valor / this.maximo()) * 100;
  }

  protected percentual(valor: number): number {
    return this.total() ? Math.round((valor / this.total()) * 100) : 0;
  }
}
