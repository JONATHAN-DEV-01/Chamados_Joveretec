import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ProjetoService, TAMANHO_MAXIMO } from '../../../core/api/projeto.service';
import { ChamadoResumo } from '../../../core/models/chamado';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { carregarComParametros, listaDeApoio } from '../../../shared/carregamento';
import { BadgeStatus, BadgeUrgencia } from '../../../shared/componentes/badges';
import { Responsaveis } from '../../../shared/componentes/responsaveis';

@Component({
  selector: 'app-fila-projeto',
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle, BadgeUrgencia, BadgeStatus, Responsaveis],
  templateUrl: './fila-projeto.html',
  styleUrl: './fila-projeto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaProjeto {
  /** Query param `projetoId`. */
  readonly projetoId = input<string>();

  private readonly router = inject(Router);
  private readonly chamados = inject(ChamadoService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly String = String;
  protected readonly projetos = listaDeApoio(inject(ProjetoService).listarParaSelecao());

  protected readonly idProjeto = computed(() => Number(this.projetoId()) || null);
  protected readonly carregamento = carregarComParametros(this.idProjeto, (projetoId) =>
    projetoId
      ? this.chamados.listar({ projetoId, ordem: 'POSICAO' }, { tamanho: TAMANHO_MAXIMO })
      : of(null),
  );
  /** Cópia local para refletir o movimento na hora (atualização otimista). */
  protected readonly itens = linkedSignal(() => this.carregamento.dados()?.itens ?? []);
  protected readonly incompleta = computed(() => {
    const dados = this.carregamento.dados();
    return !!dados && dados.totalItens > dados.itens.length;
  });
  protected readonly salvando = signal(false);

  protected escolherProjeto(evento: Event): void {
    const projetoId = (evento.target as HTMLSelectElement).value || null;
    void this.router.navigate([], { queryParams: { projetoId } });
  }

  protected soltar(evento: CdkDragDrop<ChamadoResumo[]>): void {
    this.mover(evento.previousIndex, evento.currentIndex);
  }

  protected mover(de: number, para: number): void {
    const lista = [...this.itens()];
    if (para < 0 || para >= lista.length || de === para || this.salvando()) {
      return;
    }
    const chamado = lista[de];
    moveItemInArray(lista, de, para);
    this.itens.set(lista);
    this.salvando.set(true);

    // A fila é contínua (1..n), então a posição de destino é o índice + 1.
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
