import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Pagina } from '../../core/models/comum';

/** Controles de paginação no servidor (`pagina` começa em 0). */
@Component({
  selector: 'app-paginacao',
  template: `
    @if (pagina().totalItens > 0) {
      <nav class="paginacao" aria-label="Paginação">
        <span class="texto-suave">{{ resumo() }}</span>
        <div class="acoes">
          <button type="button" class="btn btn-pequeno" [disabled]="pagina().pagina === 0" (click)="ir(pagina().pagina - 1)">
            Anterior
          </button>
          <span aria-current="page">Página {{ pagina().pagina + 1 }} de {{ pagina().totalPaginas }}</span>
          <button
            type="button"
            class="btn btn-pequeno"
            [disabled]="pagina().pagina + 1 >= pagina().totalPaginas"
            (click)="ir(pagina().pagina + 1)"
          >
            Próxima
          </button>
        </div>
      </nav>
    }
  `,
  styles: `
    .paginacao { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginacao {
  readonly pagina = input.required<Pagina<unknown>>();
  readonly mudar = output<number>();

  protected readonly resumo = computed(() => {
    const { pagina, tamanho, totalItens, itens } = this.pagina();
    const inicio = pagina * tamanho + 1;
    return `${inicio}–${inicio + itens.length - 1} de ${totalItens}`;
  });

  protected ir(pagina: number): void {
    this.mudar.emit(pagina);
  }
}
