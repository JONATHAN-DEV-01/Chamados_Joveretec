import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardService, Indicadores } from '../../core/api/dashboard.service';
import { ProjetoService } from '../../core/api/projeto.service';
import { AuthService } from '../../core/auth/auth.service';
import { STATUS, StatusChamado, URGENCIAS } from '../../core/models/chamado';
import { carregarComParametros, listaDeApoio } from '../../shared/carregamento';
import { ROTULO_STATUS, ROTULO_URGENCIA } from '../../shared/rotulos';
import { Barra, Barras } from './barras';
import { COR_STATUS, COR_URGENCIA } from './cores-serie';

interface Segmento {
  status: StatusChamado;
  valor: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Barras],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  /** Query param opcional para restringir os indicadores a um projeto. */
  readonly projetoId = input<string>();

  private readonly router = inject(Router);
  private readonly dashboard = inject(DashboardService);
  protected readonly usuario = inject(AuthService).usuario;
  protected readonly projetos = listaDeApoio(inject(ProjetoService).listarParaSelecao(true));
  protected readonly String = String;

  protected readonly STATUS = STATUS;
  protected readonly ROTULO_STATUS = ROTULO_STATUS;
  protected readonly COR_STATUS = COR_STATUS;

  private readonly idProjeto = computed(() => Number(this.projetoId()) || null);
  protected readonly carregamento = carregarComParametros(this.idProjeto, (id) => this.dashboard.indicadores(id));

  /** Filtros base para os links que abrem a lista de chamados. */
  private readonly filtroBase = computed(() => {
    const filtro: Record<string, string | number> = {};
    const id = this.idProjeto();
    if (id) {
      filtro['projetoId'] = id;
    }
    return filtro;
  });

  protected readonly meusPorStatus = computed(() =>
    contagemPor(this.carregamento.dados()?.meus.porStatus.map((t) => [t.status, t.total] as const)),
  );

  protected readonly barrasStatus = computed<Barra[]>(() => {
    const dados = this.carregamento.dados();
    return (dados?.porStatus ?? []).map(({ status, total }) => ({
      rotulo: ROTULO_STATUS[status],
      valor: total,
      cor: COR_STATUS[status],
      filtro: { ...this.filtroBase(), status },
    }));
  });

  protected readonly barrasUrgencia = computed<Barra[]>(() => {
    const totais = contagemPor(this.carregamento.dados()?.porUrgencia.map((t) => [t.urgencia, t.total] as const));
    return URGENCIAS.map((urgencia) => ({
      rotulo: ROTULO_URGENCIA[urgencia],
      valor: totais.get(urgencia) ?? 0,
      cor: COR_URGENCIA[urgencia],
      filtro: { ...this.filtroBase(), urgencia },
    }));
  });

  protected readonly desenvolvedores = computed(() => {
    const lista = this.carregamento.dados()?.porDesenvolvedor ?? [];
    const maior = Math.max(1, ...lista.map((d) => d.total));
    return lista.map((d) => ({
      ...d,
      largura: (d.total / maior) * 100,
      segmentos: [
        { status: 'ABERTO', valor: d.abertos },
        { status: 'EM_ANDAMENTO', valor: d.emAndamento },
        { status: 'CONCLUIDO', valor: d.concluidos },
      ] satisfies Segmento[],
    }));
  });

  protected linkMeus(status?: StatusChamado): Record<string, string | number> {
    const id = this.usuario()?.id ?? '';
    return { ...this.filtroBase(), responsavel: id, ...(status ? { status } : {}) };
  }

  protected linkDesenvolvedor(id: number): Record<string, string | number> {
    return { ...this.filtroBase(), responsavel: id };
  }

  protected escolherProjeto(evento: Event): void {
    const projetoId = (evento.target as HTMLSelectElement).value || null;
    void this.router.navigate([], { queryParams: { projetoId } });
  }

  protected totalGeral(dados: Indicadores): number {
    return dados.porStatus.reduce((soma, t) => soma + t.total, 0);
  }
}

function contagemPor<K>(pares: readonly (readonly [K, number])[] | undefined): Map<K, number> {
  return new Map(pares ?? []);
}
