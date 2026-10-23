import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ConfiguracaoService } from '../../../core/api/configuracao.service';
import { ProjetoService } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ChamadoResumo, STATUS, StatusChamado, URGENCIAS, Urgencia } from '../../../core/models/chamado';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { ATRASO_BUSCA_MS } from '../../../shared/busca-com-atraso';
import { carregarComParametros, listaDeApoio } from '../../../shared/carregamento';
import { BadgeStatus, BadgeUrgencia } from '../../../shared/componentes/badges';
import { Paginacao } from '../../../shared/componentes/paginacao';
import { TempoRelativoPipe } from '../../../shared/formatos';
import { RotuloStatusPipe, RotuloUrgenciaPipe } from '../../../shared/rotulos';
import { ParametrosLista, SEM_RESPONSAVEL, alternar, lerLista, paginaDa, paraFiltro } from './filtro-url';

@Component({
  selector: 'app-lista-chamados',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    BadgeUrgencia,
    BadgeStatus,
    Paginacao,
    RotuloStatusPipe,
    RotuloUrgenciaPipe,
    TempoRelativoPipe,
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

  protected readonly URGENCIAS = URGENCIAS;
  protected readonly STATUS = STATUS;
  protected readonly SEM_RESPONSAVEL = SEM_RESPONSAVEL;

  protected readonly String = String;
  protected readonly projetos = listaDeApoio(inject(ProjetoService).listarParaSelecao(true));
  protected readonly usuarios = listaDeApoio(inject(UsuarioService).listarAtivos());

  private readonly parametros = computed<ParametrosLista>(() => ({
    projetoId: this.projetoId(),
    responsavel: this.responsavel(),
    status: this.status(),
    urgencia: this.urgencia(),
    busca: this.busca(),
    pagina: this.pagina(),
  }));

  protected readonly statusSelecionados = computed(() => lerLista<StatusChamado>(this.status(), STATUS));
  protected readonly urgenciasSelecionadas = computed(() => lerLista<Urgencia>(this.urgencia(), URGENCIAS));
  protected readonly temFiltros = computed(() =>
    Object.entries(this.parametros()).some(([chave, valor]) => chave !== 'pagina' && !!valor),
  );

  protected readonly lista = carregarComParametros(this.parametros, (p) =>
    this.chamados.listar(paraFiltro(p), { pagina: paginaDa(p), tamanho: this.tamanhoPagina }),
  );

  protected readonly campoBusca = new FormControl('', { nonNullable: true });

  constructor() {
    // Mantém o campo de busca igual à URL (ex.: ao voltar no navegador)...
    effect(() => {
      const busca = this.busca() ?? '';
      if (busca !== this.campoBusca.value) {
        this.campoBusca.setValue(busca, { emitEvent: false });
      }
    });
    // ...e leva o que for digitado para a URL, com debounce.
    this.campoBusca.valueChanges
      .pipe(
        debounceTime(ATRASO_BUSCA_MS),
        map((texto) => texto.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((texto) => this.filtrar({ busca: texto || null }));
  }

  protected filtrar(mudancas: Record<string, string | null>): void {
    void this.router.navigate([], {
      queryParams: { ...mudancas, pagina: null },
      queryParamsHandling: 'merge',
    });
  }

  protected alternarStatus(status: StatusChamado): void {
    this.filtrar({ status: alternar(this.statusSelecionados(), status) });
  }

  protected alternarUrgencia(urgencia: Urgencia): void {
    this.filtrar({ urgencia: alternar(this.urgenciasSelecionadas(), urgencia) });
  }

  protected limparFiltros(): void {
    this.campoBusca.setValue('', { emitEvent: false });
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

  protected valorSelect(evento: Event): string | null {
    return (evento.target as HTMLSelectElement).value || null;
  }
}
