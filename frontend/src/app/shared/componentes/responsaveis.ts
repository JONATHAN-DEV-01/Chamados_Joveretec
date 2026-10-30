import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Referencia } from '../../core/models/comum';
import { Avatar } from './avatar';

/**
 * Responsáveis de um chamado: um só aparece com avatar e nome; vários, como avatares
 * sobrepostos (os primeiros) e "+N". Os nomes completos ficam no title e para leitores de tela.
 */
@Component({
  selector: 'app-responsaveis',
  imports: [Avatar],
  template: `
    @if (responsaveis().length === 0) {
      <span class="texto-suave">Sem responsável</span>
    } @else if (responsaveis().length === 1) {
      <span class="um">
        <app-avatar [nome]="responsaveis()[0].nome" pequeno />
        <span class="nome">{{ responsaveis()[0].nome }}</span>
      </span>
    } @else {
      <span class="pilha" [attr.title]="nomes()">
        @for (pessoa of visiveis(); track pessoa.id) {
          <app-avatar [nome]="pessoa.nome" pequeno />
        }
        @if (restantes() > 0) {
          <span class="mais" aria-hidden="true">+{{ restantes() }}</span>
        }
        <span class="sr-only">{{ nomes() }}</span>
      </span>
    }
  `,
  styles: `
    :host { display: inline-flex; min-width: 0; }
    .um { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
    .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pilha { display: inline-flex; align-items: center; }
    .pilha > app-avatar + app-avatar,
    .pilha > .mais { margin-left: -8px; }
    .pilha > app-avatar { border-radius: 50%; box-shadow: 0 0 0 2px var(--cor-painel); }
    .mais {
      display: inline-grid;
      place-items: center;
      min-width: 26px;
      height: 26px;
      padding: 0 6px;
      border: 1px solid var(--cor-borda);
      border-radius: 999px;
      background: var(--cor-fundo);
      color: var(--cor-texto-suave);
      font-size: 0.7rem;
      font-weight: 700;
      box-shadow: 0 0 0 2px var(--cor-painel);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Responsaveis {
  readonly responsaveis = input.required<Referencia[]>();
  /** Quantos avatares aparecem antes do "+N". */
  readonly maximo = input(3);

  protected readonly visiveis = computed(() => this.responsaveis().slice(0, this.maximo()));
  protected readonly restantes = computed(() => this.responsaveis().length - this.visiveis().length);
  protected readonly nomes = computed(() => this.responsaveis().map((r) => r.nome).join(', '));
}
