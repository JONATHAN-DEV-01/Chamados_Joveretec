import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { ConfiguracaoService } from './api/configuracao.service';

/** Título da aba: "<página> · <nome do sistema>". */
@Injectable()
export class TituloDaPagina extends TitleStrategy {
  private readonly titulo = inject(Title);
  private readonly configuracao = inject(ConfiguracaoService);

  override updateTitle(estado: RouterStateSnapshot): void {
    const nomeSistema = this.configuracao.atual().geral.nomeSistema;
    const pagina = this.buildTitle(estado);
    this.titulo.setTitle(pagina ? `${pagina} · ${nomeSistema}` : nomeSistema);
  }
}
