import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/api/dashboard.service';
import { UltimaAtualizacao } from '../../core/models/feed';
import { listaDeApoio } from '../../shared/carregamento';
import { Avatar } from '../../shared/componentes/avatar';
import { TempoRelativoPipe } from '../../shared/formatos';

/** Bloco do dashboard com os acompanhamentos mais recentes nos chamados do usuário. */
@Component({
  selector: 'app-ultimas-atualizacoes',
  imports: [RouterLink, DatePipe, Avatar, TempoRelativoPipe],
  template: `
    <h2 id="titulo-ultimas">Últimas atualizações</h2>
    <p class="dica">Nos chamados em que você é responsável ou autor</p>
    @if (itens().length) {
      <ul class="lista" aria-labelledby="titulo-ultimas">
        @for (item of itens(); track item.acompanhamentoId) {
          <li>
            <app-avatar [nome]="item.autor.nome" />
            <div class="texto">
              <p class="topo">
                <strong>{{ item.autor.nome }}</strong>
                @if (item.tipo === 'SOLUCAO') {
                  <span class="selo">Solução</span>
                }
                em <a [routerLink]="['/chamados', item.chamado.id]">#{{ item.chamado.id }} {{ item.chamado.titulo }}</a>
                <time class="texto-suave" [attr.datetime]="item.criadoEm" [title]="item.criadoEm | date: 'dd/MM/yyyy HH:mm'">
                  · {{ item.criadoEm | tempoRelativo }}
                </time>
              </p>
              <p class="resumo texto-suave">{{ item.resumo }}</p>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="vazio">Nenhuma atualização recente.</p>
    }
  `,
  styles: `
    h2 { margin-bottom: 0; }
    .dica { margin: 0 0 12px; }
    .lista { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
    li { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; align-items: start; }
    p { margin: 0; }
    .topo { font-size: 0.9rem; overflow-wrap: anywhere; }
    .resumo { margin-top: 2px; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .selo { margin: 0 4px; padding: 1px 6px; border-radius: 999px; background: var(--cor-destaque); color: var(--cor-sobre-destaque); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .vazio { padding: 12px 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UltimasAtualizacoes {
  protected readonly itens = listaDeApoio<UltimaAtualizacao>(inject(DashboardService).ultimasAtualizacoes());
}
