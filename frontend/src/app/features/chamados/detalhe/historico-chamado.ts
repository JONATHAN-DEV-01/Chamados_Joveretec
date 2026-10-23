import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ApiErro } from '../../../core/api/api-erro';
import { Historico, StatusChamado, Urgencia } from '../../../core/models/chamado';
import { ROTULO_CAMPO_HISTORICO, ROTULO_STATUS, ROTULO_URGENCIA } from '../../../shared/rotulos';

const TAMANHO = 15;

/** Linha do tempo de alterações do chamado, com "carregar mais". */
@Component({
  selector: 'app-historico-chamado',
  imports: [DatePipe],
  template: `
    <h2>Histórico</h2>
    @if (erro(); as mensagem) {
      <p class="alerta" role="alert">{{ mensagem }}</p>
    }
    <ol class="linha-do-tempo">
      @for (item of itens(); track item.id) {
        <li>
          <p class="quem">
            <strong>{{ item.usuario.nome }}</strong> {{ descrever(item) }}
          </p>
          @if (mostraValores(item)) {
            <p class="valores">
              <span class="anterior">{{ valor(item, item.valorAnterior) }}</span>
              <span aria-hidden="true">→</span>
              <span class="sr-only">para</span>
              <span>{{ valor(item, item.valorNovo) }}</span>
            </p>
          }
          <time class="texto-suave" [attr.datetime]="item.alteradoEm">{{ item.alteradoEm | date: 'dd/MM/yyyy HH:mm' }}</time>
        </li>
      } @empty {
        @if (!carregando()) {
          <li class="texto-suave">Sem alterações registradas.</li>
        }
      }
    </ol>
    @if (temMais()) {
      <button type="button" class="btn btn-pequeno" [disabled]="carregando()" (click)="carregar(pagina() + 1)">
        Carregar mais
      </button>
    }
  `,
  styles: `
    .linha-do-tempo { display: flex; flex-direction: column; gap: 14px; margin: 0 0 12px; padding: 0 0 0 16px; border-left: 2px solid var(--cor-borda); list-style: none; }
    li { position: relative; }
    li::before { position: absolute; top: 7px; left: -21px; width: 8px; height: 8px; border-radius: 50%; background: var(--cor-destaque); content: ''; }
    p { margin: 0; }
    .valores { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0; font-size: 0.9rem; }
    .anterior { color: var(--cor-texto-suave); text-decoration: line-through; }
    time { font-size: 0.8rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricoChamado {
  readonly chamadoId = input.required<number>();
  /** Muda a cada alteração do chamado; dispara o recarregamento do histórico. */
  readonly versao = input.required<number>();

  private readonly chamados = inject(ChamadoService);
  protected readonly itens = signal<Historico[]>([]);
  protected readonly pagina = signal(0);
  protected readonly temMais = signal(false);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.chamadoId();
      this.versao();
      untracked(() => this.carregar(0));
    });
  }

  protected carregar(pagina: number): void {
    this.carregando.set(true);
    this.chamados.historico(this.chamadoId(), { pagina, tamanho: TAMANHO }).subscribe({
      next: (resultado) => {
        this.itens.update((atuais) => (pagina === 0 ? resultado.itens : [...atuais, ...resultado.itens]));
        this.pagina.set(pagina);
        this.temMais.set(pagina + 1 < resultado.totalPaginas);
        this.erro.set(null);
        this.carregando.set(false);
      },
      error: (falha: unknown) => {
        this.erro.set(ApiErro.mensagemDe(falha));
        this.carregando.set(false);
      },
    });
  }

  protected descrever(item: Historico): string {
    if (item.campo === 'CRIACAO') {
      return 'criou o chamado';
    }
    if (item.campo === 'DESCRICAO') {
      return 'alterou a descrição';
    }
    return `alterou ${ROTULO_CAMPO_HISTORICO[item.campo].toLowerCase()}`;
  }

  protected mostraValores(item: Historico): boolean {
    return item.campo !== 'CRIACAO' && item.campo !== 'DESCRICAO';
  }

  protected valor(item: Historico, valor: string | null): string {
    if (valor === null) {
      return item.campo === 'RESPONSAVEL' ? 'ninguém' : '—';
    }
    switch (item.campo) {
      case 'STATUS':
        return ROTULO_STATUS[valor as StatusChamado] ?? valor;
      case 'URGENCIA':
        return ROTULO_URGENCIA[valor as Urgencia] ?? valor;
      case 'POSICAO':
        return `#${valor}`;
      default:
        return valor;
    }
  }
}
