import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { CONFIGURACAO_PADRAO, Configuracao } from '../models/configuracao';
import { TemaService } from '../tema/tema.service';
import { urlApi } from './parametros';

@Injectable({ providedIn: 'root' })
export class ConfiguracaoService {
  private readonly http = inject(HttpClient);
  private readonly tema = inject(TemaService);
  private readonly url = urlApi('/configuracoes');

  private readonly _atual = signal<Configuracao>(CONFIGURACAO_PADRAO);
  /** Configuração em uso (padrão até o carregamento terminar). */
  readonly atual = this._atual.asReadonly();

  /** Carrega e aplica a paleta; em caso de falha mantém a padrão (o app nunca deixa de abrir). */
  carregar(): Observable<Configuracao> {
    return this.http.get<Configuracao>(this.url).pipe(
      catchError(() => of(CONFIGURACAO_PADRAO)),
      tap((configuracao) => this.usar(configuracao)),
    );
  }

  salvar(configuracao: Configuracao): Observable<Configuracao> {
    return this.http.put<Configuracao>(this.url, configuracao).pipe(tap((salva) => this.usar(salva)));
  }

  private usar(configuracao: Configuracao): void {
    this._atual.set(configuracao);
    this.tema.aplicar(configuracao.paleta);
  }
}
