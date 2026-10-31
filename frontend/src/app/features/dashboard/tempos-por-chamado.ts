import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemposDashboard } from '../../core/models/dashboard';
import { BadgeStatus, BadgeUrgencia } from '../../shared/componentes/badges';
import { TempoCorridoPipe } from '../../shared/formatos';

/**
 * Card do dashboard com o tempo corrido dos chamados (pelo histórico de status): médias dos
 * concluídos, média por responsável e os chamados abertos há mais tempo.
 */
@Component({
  selector: 'app-tempos-por-chamado',
  imports: [RouterLink, BadgeStatus, BadgeUrgencia, TempoCorridoPipe],
  template: `
    <h2 id="titulo-tempos">Tempo por chamado</h2>
    <p class="dica">Tempo corrido (24h por dia), contado pelas mudanças de status</p>

    <div class="indicadores">
      <div class="indicador">
        <span class="rotulo">Resolução média</span>
        <span class="valor">{{ tempos().resolucaoMediaSegundos | tempoCorrido }}</span>
        <span class="texto-suave detalhe">da abertura à conclusão</span>
      </div>
      <div class="indicador">
        <span class="rotulo">Em andamento, em média</span>
        <span class="valor">{{ tempos().andamentoMedioSegundos | tempoCorrido }}</span>
        <span class="texto-suave detalhe">tempo no status "Em andamento"</span>
      </div>
      <div class="indicador">
        <span class="rotulo">Base</span>
        <span class="valor">{{ tempos().concluidos }}</span>
        <span class="texto-suave detalhe">{{ tempos().concluidos === 1 ? 'chamado concluído' : 'chamados concluídos' }}</span>
      </div>
    </div>

    <div class="colunas-tempo">
      <section aria-labelledby="titulo-tempo-responsavel">
        <h3 id="titulo-tempo-responsavel">Média por responsável</h3>
        @if (tempos().porResponsavel.length) {
          <div class="tabela-container">
            <table class="tabela">
              <thead>
                <tr>
                  <th scope="col">Responsável</th>
                  <th scope="col" class="num">Concluídos</th>
                  <th scope="col" class="num">Resolução</th>
                  <th scope="col" class="num">Em andamento</th>
                </tr>
              </thead>
              <tbody>
                @for (linha of tempos().porResponsavel; track linha.usuario.id) {
                  <tr>
                    <td>{{ linha.usuario.nome }}</td>
                    <td class="num">{{ linha.concluidos }}</td>
                    <td class="num">{{ linha.resolucaoMediaSegundos | tempoCorrido }}</td>
                    <td class="num">{{ linha.andamentoMedioSegundos | tempoCorrido }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="texto-suave nota">Um chamado com vários responsáveis conta para cada um deles.</p>
        } @else {
          <p class="vazio">Nenhum chamado concluído com responsável ainda.</p>
        }
      </section>

      <section aria-labelledby="titulo-mais-antigos">
        <h3 id="titulo-mais-antigos">Abertos há mais tempo</h3>
        @if (tempos().abertosHaMaisTempo.length) {
          <ol class="antigos">
            @for (item of tempos().abertosHaMaisTempo; track item.chamado.id) {
              <li>
                <a class="titulo" [routerLink]="['/chamados', item.chamado.id]">#{{ item.chamado.id }} {{ item.chamado.titulo }}</a>
                <span class="selos">
                  <app-badge-status [status]="item.status" />
                  <app-badge-urgencia [urgencia]="item.urgencia" />
                </span>
                <span class="idade">
                  <strong>há {{ item.abertoHaSegundos | tempoCorrido }}</strong>
                  @if (item.emAndamentoSegundos) {
                    <span class="texto-suave">· {{ item.emAndamentoSegundos | tempoCorrido }} em andamento</span>
                  }
                </span>
              </li>
            }
          </ol>
        } @else {
          <p class="vazio">Nenhum chamado em aberto.</p>
        }
      </section>
    </div>
  `,
  styles: `
    h2 { margin-bottom: 0; }
    h3 { margin: 0 0 8px; font-size: 0.95rem; }
    .dica { margin: 0 0 14px; }
    .indicadores { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .indicador { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-fundo); }
    .indicador .rotulo { color: var(--cor-texto-suave); font-size: 0.8rem; }
    .indicador .valor { font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .indicador .detalhe { font-size: 0.78rem; }
    .colunas-tempo { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--espaco); }
    .num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
    .nota { margin: 6px 0 0; font-size: 0.8rem; }
    .antigos { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .antigos li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--cor-borda); }
    .antigos li:last-child { padding-bottom: 0; border-bottom: 0; }
    .titulo { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .selos { display: inline-flex; gap: 6px; }
    .idade { grid-column: 1 / -1; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    .idade .texto-suave { margin-left: 4px; }
    .vazio { padding: 12px 0; }
    @media (max-width: 760px) {
      .indicadores, .colunas-tempo { grid-template-columns: minmax(0, 1fr); }
      .indicadores { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .indicador { padding: 10px; }
      .indicador .valor { font-size: 1.2rem; }
      .indicador .detalhe { display: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemposPorChamado {
  readonly tempos = input.required<TemposDashboard>();
}
