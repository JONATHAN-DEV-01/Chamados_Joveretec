import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { novidadesDaVersao } from '../core/novidades/novidades';
import { NovidadesService } from '../core/novidades/novidades.service';

/**
 * Pop-up "Novidades da plataforma" (só dentro do sistema, nunca no login). "Entendi", o X, Esc,
 * o clique fora e os atalhos fecham e marcam como visto.
 */
@Component({
  selector: 'app-novidades-dialogo',
  imports: [RouterLink],
  template: `
    <dialog
      #dialogo
      class="novidades"
      aria-labelledby="titulo-novidades"
      (cancel)="$event.preventDefault(); fechar()"
      (click)="cliqueFora($event)"
    >
      <div class="caixa">
        <header>
          <div>
            <p class="rotulo">Atualização de {{ data }}</p>
            <h2 id="titulo-novidades">Novidades da plataforma</h2>
          </div>
          <button type="button" class="btn btn-fantasma fechar" (click)="fechar()" aria-label="Fechar novidades">✕</button>
        </header>
        <ul class="itens">
          @for (item of versao.itens; track item.titulo) {
            <li>
              <h3>{{ item.titulo }}</h3>
              <p>{{ item.texto }}</p>
              @if (item.link; as link) {
                <a [routerLink]="link.rota" (click)="fechar()">{{ link.rotulo }} →</a>
              }
            </li>
          }
        </ul>
        <footer>
          <button type="button" class="btn btn-primario" (click)="fechar()">Entendi</button>
        </footer>
      </div>
    </dialog>
  `,
  styles: `
    .novidades { width: min(560px, calc(100vw - 32px)); max-height: min(720px, calc(100dvh - 32px)); padding: 0; border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-painel); color: var(--cor-texto); box-shadow: 0 20px 60px rgb(0 0 0 / 0.45); }
    .novidades[open] { display: flex; overflow: hidden; }
    .novidades::backdrop { background: rgb(0 0 0 / 0.6); }
    /* Só a lista rola: cabeçalho e "Entendi" ficam sempre visíveis. */
    .caixa { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px 8px; }
    header h2 { margin: 2px 0 0; }
    header .rotulo { margin: 0; }
    .fechar { flex: none; }
    .itens { display: flex; flex: 1 1 auto; flex-direction: column; gap: 14px; min-height: 0; margin: 0; padding: 8px 20px 12px; overflow-y: auto; list-style: none; }
    .itens li { padding-left: 12px; border-left: 3px solid var(--cor-destaque); }
    h3 { margin: 0 0 2px; font-size: 0.95rem; }
    .itens p { margin: 0; color: var(--cor-texto-suave); font-size: 0.9rem; }
    .itens a { display: inline-block; margin-top: 4px; font-size: 0.85rem; }
    footer { display: flex; justify-content: flex-end; padding: 12px 20px 18px; border-top: 1px solid var(--cor-borda); }
    @media (max-width: 480px) { header, .itens, footer { padding-left: 14px; padding-right: 14px; } footer .btn { width: 100%; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovidadesDialogo {
  private readonly servico = inject(NovidadesService);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly versao = novidadesDaVersao();
  /** A data vem como AAAA-MM-DD; montada à mão para não mudar de dia com o fuso. */
  protected readonly data = this.versao.data.split('-').reverse().join('/');

  constructor() {
    effect(() => {
      const dialogo = this.dialogo().nativeElement;
      if (this.servico.aberto() && !dialogo.open) {
        dialogo.showModal();
      } else if (!this.servico.aberto() && dialogo.open) {
        dialogo.close();
      }
    });
  }

  /** O clique no fundo escurecido chega ao próprio <dialog> (o conteúdo fica na .caixa). */
  protected cliqueFora(evento: MouseEvent): void {
    if (evento.target === this.dialogo().nativeElement) {
      this.fechar();
    }
  }

  protected fechar(): void {
    this.servico.fechar();
  }
}
