import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ProjetoService } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { AuthService } from '../../../core/auth/auth.service';
import { STATUS, StatusChamado, URGENCIAS, Urgencia } from '../../../core/models/chamado';
import { ATRASO_BUSCA_MS } from '../../../shared/busca-com-atraso';
import { listaDeApoio } from '../../../shared/carregamento';
import { RotuloStatusPipe, RotuloUrgenciaPipe } from '../../../shared/rotulos';
import { ParametrosLista, SEM_RESPONSAVEL, alternar, lerLista } from '../lista/filtro-url';

/** Mudanças de filtro no formato dos query params (null = remover). */
export type MudancaDeFiltro = Partial<Record<keyof ParametrosLista, string | null>>;

/** Há algum filtro aplicado? Paginação não conta; o projeto só conta onde ele é um filtro. */
export function temFiltrosAtivos(p: ParametrosLista, projetoEhFiltro = true): boolean {
  return !!(p.busca || p.responsavel || p.status || p.urgencia || (projetoEhFiltro && p.projetoId));
}

/**
 * Filtros de chamados (busca, projeto, responsável e chips de urgência e status), usados na
 * lista e na fila. A página continua dona da URL: aqui só se lê o estado e se emitem mudanças.
 */
@Component({
  selector: 'app-filtros-chamados',
  imports: [ReactiveFormsModule, RotuloStatusPipe, RotuloUrgenciaPipe],
  templateUrl: './filtros-chamados.html',
  styleUrl: './filtros-chamados.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosChamados {
  readonly parametros = input.required<ParametrosLista>();
  /** Status oferecidos nos chips (a fila só tem Aberto e Em andamento). */
  readonly statusDisponiveis = input<readonly StatusChamado[]>(STATUS);
  /** A fila tem o próprio seletor de projeto, fora dos filtros. */
  readonly mostrarProjeto = input(true);

  readonly filtrar = output<MudancaDeFiltro>();
  readonly limpar = output<void>();

  protected readonly URGENCIAS = URGENCIAS;
  protected readonly SEM_RESPONSAVEL = SEM_RESPONSAVEL;
  protected readonly String = String;
  protected readonly usuarioLogado = inject(AuthService).usuario;
  protected readonly usuarios = listaDeApoio(inject(UsuarioService).listarAtivos());
  protected readonly projetos = listaDeApoio(inject(ProjetoService).listarParaSelecao(true));

  protected readonly statusSelecionados = computed(() =>
    lerLista<StatusChamado>(this.parametros().status, this.statusDisponiveis()),
  );
  protected readonly urgenciasSelecionadas = computed(() => lerLista<Urgencia>(this.parametros().urgencia, URGENCIAS));
  protected readonly temFiltros = computed(() => temFiltrosAtivos(this.parametros(), this.mostrarProjeto()));

  protected readonly campoBusca = new FormControl('', { nonNullable: true });

  constructor() {
    // Mantém o campo de busca igual à URL (ex.: ao voltar no navegador)...
    effect(() => {
      const busca = this.parametros().busca ?? '';
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
      .subscribe((texto) => this.filtrar.emit({ busca: texto || null }));
  }

  protected alternarStatus(status: StatusChamado): void {
    this.filtrar.emit({ status: alternar(this.statusSelecionados(), status) });
  }

  protected alternarUrgencia(urgencia: Urgencia): void {
    this.filtrar.emit({ urgencia: alternar(this.urgenciasSelecionadas(), urgencia) });
  }

  protected limparTudo(): void {
    this.campoBusca.setValue('', { emitEvent: false });
    this.limpar.emit();
  }

  protected valorSelect(evento: Event): string | null {
    return (evento.target as HTMLSelectElement).value || null;
  }
}
