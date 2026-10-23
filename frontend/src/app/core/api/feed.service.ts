import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagina, Paginacao } from '../models/comum';
import { Acompanhamento, ItemFeed, OrdemFeed, PublicarAcompanhamento, SalvarAcompanhamento } from '../models/feed';
import { parametros, urlApi } from './parametros';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http = inject(HttpClient);

  feed(chamadoId: number, ordem: OrdemFeed, paginacao: Paginacao = {}): Observable<Pagina<ItemFeed>> {
    return this.http.get<Pagina<ItemFeed>>(urlApi(`/chamados/${chamadoId}/feed`), {
      params: parametros({ ordem, ...paginacao }),
    });
  }

  publicar(chamadoId: number, acompanhamento: PublicarAcompanhamento): Observable<Acompanhamento> {
    return this.http.post<Acompanhamento>(this.url(chamadoId), acompanhamento);
  }

  /** Rascunho que recebe os anexos antes da publicação (o caminho no Storage usa o id dele). */
  criarRascunho(chamadoId: number): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.url(chamadoId)}/rascunhos`, null);
  }

  editar(chamadoId: number, id: number, dados: SalvarAcompanhamento): Observable<Acompanhamento> {
    return this.http.put<Acompanhamento>(`${this.url(chamadoId)}/${id}`, dados);
  }

  excluir(chamadoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.url(chamadoId)}/${id}`);
  }

  private url(chamadoId: number): string {
    return urlApi(`/chamados/${chamadoId}/acompanhamentos`);
  }
}
