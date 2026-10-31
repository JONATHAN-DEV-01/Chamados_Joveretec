import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ConfiguracaoService } from '../../../core/api/configuracao.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ChamadoResumo } from '../../../core/models/chamado';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { carregarComParametros } from '../../../shared/carregamento';
import { BadgeStatus, BadgeUrgencia } from '../../../shared/componentes/badges';
import { Esqueleto } from '../../../shared/componentes/esqueleto';
import { Paginacao } from '../../../shared/componentes/paginacao';
import { Responsaveis } from '../../../shared/componentes/responsaveis';
import { TempoRelativoPipe } from '../../../shared/formatos';
import { FiltrosChamados, MudancaDeFiltro, temFiltrosAtivos } from '../filtros/filtros-chamados';
import { ParametrosLista, paginaDa, paraFiltro } from './filtro-url';

@Component({
  selector: 'app-lista-chamados',
  imports: [
    RouterLink,
    DatePipe,
    BadgeUrgencia,
    BadgeStatus,
    Esqueleto,
    Paginacao,
    Responsaveis,
    TempoRelativoPipe,
    FiltrosChamados,
  ],
  templateUrl: './lista-chamados.html',
  styleUrl: './lista-chamados.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaChamados {
  // Query params da URL (withComponentInputBinding): a URL é a fonte de verdade dos filtros.
  readonly projetoId = input<string>();
  readonly responsavel = input<string>();
  readonly status = input<string>();
  readonly urgencia = input<string>();
  readonly busca = input<string>();
  readonly pagina = input<string>();

  private readonly router = inject(Router);
  private readonly chamados = inject(ChamadoService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly tamanhoPagina = inject(ConfiguracaoService).atual().geral.tamanhoPaginaPadrao;
  protected readonly usuarioLogado = inject(AuthService).usuario;

  protected readonly parametros = computed<ParametrosLista>(() => ({
    projetoId: this.projetoId(),
    responsavel: this.responsavel(),
    status: this.status(),
    urgencia: this.urgencia(),
    busca: this.busca(),
    pagina: this.pagina(),
  }));

  protected readonly temFiltros = computed(() => temFiltrosAtivos(this.parametros()));

  protected readonly lista = carregarComParametros(
    this.parametros,
    (p) => this.chamados.listar(paraFiltro(p), { pagina: paginaDa(p), tamanho: this.tamanhoPagina }),
    { cache: 'chamados' },
  );

  protected filtrar(mudancas: MudancaDeFiltro): void {
    void this.router.navigate([], {
      queryParams: { ...mudancas, pagina: null },
      queryParamsHandling: 'merge',
    });
  }

  protected limparFiltros(): void {
    void this.router.navigate([]);
  }

  protected irParaPagina(pagina: number): void {
    void this.router.navigate([], { queryParams: { pagina: pagina || null }, queryParamsHandling: 'merge' });
  }

  protected atribuirAMim(chamado: ChamadoResumo): void {
    this.chamados.atribuirAMim(chamado.id).subscribe({
      next: () => {
        this.notificacao.sucesso(`Chamado "${chamado.titulo}" atribuído a você.`);
        this.lista.recarregar();
      },
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }

  protected ehResponsavel(chamado: ChamadoResumo): boolean {
    return chamado.responsaveis.some((r) => r.id === this.usuarioLogado()?.id);
  }
}
