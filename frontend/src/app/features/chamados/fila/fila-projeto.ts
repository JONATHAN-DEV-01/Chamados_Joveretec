import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ProjetoService, TAMANHO_MAXIMO } from '../../../core/api/projeto.service';
import { ChamadoResumo, STATUS_DA_FILA } from '../../../core/models/chamado';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { carregarComParametros, listaDeApoio } from '../../../shared/carregamento';
import { BadgeStatus, BadgeUrgencia } from '../../../shared/componentes/badges';
import { Esqueleto } from '../../../shared/componentes/esqueleto';
import { Responsaveis } from '../../../shared/componentes/responsaveis';
import { FiltrosChamados, MudancaDeFiltro, temFiltrosAtivos } from '../filtros/filtros-chamados';
import { ParametrosLista, lerLista, paraFiltro } from '../lista/filtro-url';

@Component({
  selector: 'app-fila-projeto',
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle, BadgeUrgencia, BadgeStatus, Esqueleto, Responsaveis, FiltrosChamados],
  templateUrl: './fila-projeto.html',
  styleUrl: './fila-projeto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaProjeto {
  // Query params da URL: projeto e os mesmos filtros da lista de chamados.
  readonly projetoId = input<string>();
  readonly responsavel = input<string>();
  readonly status = input<string>();
  readonly urgencia = input<string>();
  readonly busca = input<string>();

  private readonly router = inject(Router);
  private readonly chamados = inject(ChamadoService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly String = String;
  protected readonly STATUS_DA_FILA = STATUS_DA_FILA;
  protected readonly projetos = listaDeApoio(inject(ProjetoService).listarParaSelecao());

  protected readonly idProjeto = computed(() => Number(this.projetoId()) || null);
  protected readonly parametros = computed<ParametrosLista>(() => ({
    projetoId: this.projetoId(),
    responsavel: this.responsavel(),
    status: this.status(),
    urgencia: this.urgencia(),
    busca: this.busca(),
  }));
  /** Com filtro, a lista é parcial: reordenar nela embaralharia a fila de verdade. */
  protected readonly filtrada = computed(() => temFiltrosAtivos(this.parametros(), false));

  protected readonly carregamento = carregarComParametros(
    this.parametros,
    (p) => {
      const projetoId = Number(p.projetoId) || null;
      if (!projetoId) {
        return of(null);
      }
      // A fila só tem chamados ativos; sem chip de status marcado, valem os dois.
      const status = lerLista(p.status, STATUS_DA_FILA);
      return this.chamados.listar(
        { ...paraFiltro(p), projetoId, status: status.length ? status : [...STATUS_DA_FILA], ordem: 'POSICAO' },
        { tamanho: TAMANHO_MAXIMO },
      );
    },
    { cache: 'fila' },
  );
  /** Cópia local para refletir o movimento na hora (atualização otimista). */
  protected readonly itens = linkedSignal(() => this.carregamento.dados()?.itens ?? []);
  protected readonly incompleta = computed(() => {
    const dados = this.carregamento.dados();
    return !!dados && dados.totalItens > dados.itens.length;
  });
  protected readonly salvando = signal(false);
  protected readonly reordenacaoBloqueada = computed(() => this.salvando() || this.filtrada());

  protected escolherProjeto(evento: Event): void {
    const projetoId = (evento.target as HTMLSelectElement).value || null;
    void this.router.navigate([], { queryParams: { projetoId }, queryParamsHandling: 'merge' });
  }

  protected filtrar(mudancas: MudancaDeFiltro): void {
    void this.router.navigate([], { queryParams: mudancas, queryParamsHandling: 'merge' });
  }

  /** Limpa os filtros, mas continua no mesmo projeto. */
  protected limparFiltros(): void {
    void this.router.navigate([], { queryParams: { projetoId: this.projetoId() ?? null } });
  }

  protected soltar(evento: CdkDragDrop<ChamadoResumo[]>): void {
    this.mover(evento.previousIndex, evento.currentIndex);
  }

  protected mover(de: number, para: number): void {
    const lista = [...this.itens()];
    if (para < 0 || para >= lista.length || de === para || this.reordenacaoBloqueada()) {
      return;
    }
    const chamado = lista[de];
    moveItemInArray(lista, de, para);
    this.itens.set(lista);
    this.salvando.set(true);

    // Sem filtros, a lista é a fila inteira (1..n): a posição de destino é o índice + 1.
    this.chamados.reordenar(chamado.id, para + 1).subscribe({
      next: () => this.finalizar(),
      error: (erro: unknown) => {
        this.notificacao.erro(erro);
        this.finalizar();
      },
    });
  }

  private finalizar(): void {
    this.salvando.set(false);
    this.carregamento.recarregar();
  }
}
