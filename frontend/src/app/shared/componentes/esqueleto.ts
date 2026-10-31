import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Formato da tela enquanto o primeiro carregamento não chega (no lugar de um texto
 * "Carregando…"): linhas de uma lista/tabela ou uma grade de cartões.
 */
@Component({
  selector: 'app-esqueleto',
  template: `
    @if (tipo() === 'cartoes') {
      <div class="cartoes">
        @for (i of itens(); track i) {
          <div class="cartao-esqueleto" [class.largo]="i === 0 || i === itens().length - 1">
            <span class="barra titulo"></span>
            <span class="barra"></span>
            <span class="barra curta"></span>
          </div>
        }
      </div>
    } @else {
      <div class="linhas">
        @for (i of itens(); track i) {
          <span class="barra linha" [style.width.%]="LARGURAS[i % LARGURAS.length]"></span>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .linhas { display: flex; flex-direction: column; gap: 14px; padding: 6px 0; }
    .cartoes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--espaco); }
    .cartao-esqueleto { display: flex; flex-direction: column; gap: 12px; min-height: 140px; padding: var(--espaco); border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-painel); }
    .cartao-esqueleto.largo { grid-column: 1 / -1; }
    .barra { display: block; height: 12px; border-radius: 6px; background: linear-gradient(90deg, var(--cor-borda) 25%, var(--cor-painel) 50%, var(--cor-borda) 75%); background-size: 200% 100%; animation: brilho 1.4s ease-in-out infinite; }
    .barra.linha { height: 16px; }
    .barra.titulo { width: 40%; height: 18px; }
    .barra.curta { width: 60%; }
    @keyframes brilho { from { background-position: 100% 0; } to { background-position: -100% 0; } }
    @media (prefers-reduced-motion: reduce) { .barra { animation: none; } }
    @media (max-width: 760px) { .cartoes { grid-template-columns: minmax(0, 1fr); } }
  `,
  host: { role: 'status', 'aria-live': 'polite', '[attr.aria-label]': 'rotulo()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Esqueleto {
  readonly tipo = input<'linhas' | 'cartoes'>('linhas');
  readonly quantidade = input(6);
  /** Texto para leitores de tela (o esqueleto em si é só visual). */
  readonly rotulo = input('Carregando…');

  protected readonly LARGURAS = [100, 92, 96, 88, 98, 84];
  protected readonly itens = computed(() => Array.from({ length: this.quantidade() }, (_, i) => i));
}
