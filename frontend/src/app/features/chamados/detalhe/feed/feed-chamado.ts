import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ApiErro } from '../../../../core/api/api-erro';
import { FeedService } from '../../../../core/api/feed.service';
import { Acompanhamento, ItemFeed } from '../../../../core/models/feed';
import { Avatar } from '../../../../shared/componentes/avatar';
import { TempoRelativoPipe } from '../../../../shared/formatos';
import { CardAcompanhamento } from './card-acompanhamento';
import { chaveDoItem, descreverEvento } from './eventos';
import { ListaAnexos } from './lista-anexos';
import { NovoAcompanhamento } from './novo-acompanhamento';

const TAMANHO_PAGINA = 20;

/**
 * Linha do tempo do chamado: abertura, acompanhamentos e eventos automáticos, do mais antigo
 * (topo) ao mais recente (perto da caixa de novo acompanhamento). Carrega primeiro os mais
 * recentes e busca os anteriores sob demanda.
 */
@Component({
  selector: 'app-feed-chamado',
  imports: [DatePipe, Avatar, TempoRelativoPipe, CardAcompanhamento, ListaAnexos, NovoAcompanhamento],
  templateUrl: './feed-chamado.html',
  styleUrl: './feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedChamado {
  readonly chamadoId = input.required<number>();
  /** Muda quando o chamado é alterado fora do feed (status, responsável...): recarrega. */
  readonly versao = input.required<number>();
  /** Projeto ativo: permite novos acompanhamentos. */
  readonly podeEscrever = input(true);
  readonly chamadoConcluido = input(false);
  /** Algo no feed mudou o chamado (Solução concluiu, tempo gasto mudou...). */
  readonly alterado = output<void>();

  private readonly feed = inject(FeedService);
  protected readonly itens = signal<ItemFeed[]>([]);
  protected readonly total = signal(0);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  private paginasCarregadas = 0;

  protected readonly temAnteriores = computed(() => this.itens().length < this.total());
  protected readonly chave = chaveDoItem;
  protected readonly descrever = descreverEvento;

  constructor() {
    effect(() => {
      this.chamadoId();
      this.versao();
      untracked(() => this.recarregar());
    });
  }

  recarregar(): void {
    this.paginasCarregadas = 0;
    this.carregarPagina(0, (recentes) => this.itens.set(recentes));
  }

  protected carregarAnteriores(): void {
    this.carregarPagina(this.paginasCarregadas, (anteriores) => this.itens.update((atuais) => [...anteriores, ...atuais]));
  }

  protected aoPublicar(): void {
    this.recarregar();
    this.alterado.emit();
  }

  protected aoAtualizar(atualizado: Acompanhamento): void {
    this.itens.update((itens) =>
      itens.map((item) =>
        item.tipo === 'ACOMPANHAMENTO' && item.acompanhamento.id === atualizado.id
          ? { ...item, acompanhamento: atualizado }
          : item,
      ),
    );
    this.alterado.emit();
  }

  /** Exclusões geram eventos e mudam totais: recarrega o feed e avisa o chamado. */
  protected aoMudarConteudo(): void {
    this.recarregar();
    this.alterado.emit();
  }

  /** A API devolve do mais recente ao mais antigo (DESC); a tela mostra em ordem cronológica. */
  private carregarPagina(pagina: number, aplicar: (itensCronologicos: ItemFeed[]) => void): void {
    this.carregando.set(true);
    this.feed.feed(this.chamadoId(), 'DESC', { pagina, tamanho: TAMANHO_PAGINA }).subscribe({
      next: (resultado) => {
        aplicar([...resultado.itens].reverse());
        this.total.set(resultado.totalItens);
        this.paginasCarregadas = pagina + 1;
        this.erro.set(null);
        this.carregando.set(false);
      },
      error: (falha: unknown) => {
        this.erro.set(ApiErro.mensagemDe(falha));
        this.carregando.set(false);
      },
    });
  }
}
