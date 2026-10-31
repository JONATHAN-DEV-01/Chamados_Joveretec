import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, input, viewChild } from '@angular/core';
import { Paleta } from '../../core/models/configuracao';
import { corHexValida } from '../../core/tema/cores';
import { TemaService } from '../../core/tema/tema.service';
import { BadgeUrgencia } from './badges';

/** Miniatura da interface com as cores informadas, aplicadas só nela (variáveis CSS locais). */
@Component({
  selector: 'app-previa-de-paleta',
  imports: [BadgeUrgencia],
  template: `
    <div #previa class="tema-local previa" aria-hidden="true">
      <div class="previa-lateral">
        <strong>{{ nomeSistema() || 'Sistema' }}</strong>
        <span class="previa-item ativo">Chamados</span>
        <span class="previa-item">Dashboard</span>
      </div>
      <div class="previa-conteudo">
        <div class="previa-cartao">
          <p class="previa-titulo">Erro ao salvar relatório</p>
          <p class="previa-texto">Texto secundário de exemplo e um <a>link</a>.</p>
          <div class="previa-selos">
            <app-badge-urgencia urgencia="CRITICA" />
            <app-badge-urgencia urgencia="ALTA" />
            <app-badge-urgencia urgencia="MEDIA" />
          </div>
        </div>
        <div class="previa-botoes">
          <span class="btn btn-primario btn-pequeno">Botão primário</span>
          <span class="btn btn-pequeno">Secundário</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .previa { display: grid; grid-template-columns: 120px 1fr; min-height: 240px; overflow: hidden; border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-fundo); color: var(--cor-texto); }
    .previa-lateral { display: flex; flex-direction: column; gap: 6px; padding: 12px 8px; border-right: 1px solid var(--cor-borda); font-size: 0.8rem; }
    .previa-item { padding: 4px 6px; border-left: 3px solid transparent; border-radius: 4px; color: var(--cor-texto-suave); }
    .previa-item.ativo { border-left-color: var(--cor-destaque); background: var(--cor-painel); color: var(--cor-texto); }
    .previa-conteudo { display: flex; flex-direction: column; gap: 12px; padding: 14px; }
    .previa-cartao { padding: 12px; border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-painel); }
    .previa-titulo { margin: 0 0 4px; font-weight: 600; }
    .previa-texto { margin: 0 0 10px; color: var(--cor-texto-suave); font-size: 0.85rem; }
    .previa-texto a { color: var(--cor-destaque); }
    .previa-selos, .previa-botoes { display: flex; flex-wrap: wrap; gap: 6px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviaDePaleta {
  readonly paleta = input.required<Partial<Paleta>>();
  readonly nomeSistema = input('');

  private readonly tema = inject(TemaService);
  private readonly previa = viewChild.required<ElementRef<HTMLElement>>('previa');

  constructor() {
    // Depois de renderizar: a prévia é um elemento do template.
    afterRenderEffect(() => {
      const paleta = this.paleta();
      if (Object.values(paleta).length === 4 && Object.values(paleta).every(corHexValida)) {
        this.tema.aplicar(paleta as Paleta, this.previa().nativeElement);
      }
    });
  }
}
