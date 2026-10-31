import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { Pagina, Paginacao } from '../models/comum';
import { FiltroProjetos, Projeto, SalvarProjetoRequest } from '../models/projeto';
import { CacheEmMemoria } from './cache-em-memoria';
import { parametros, urlApi } from './parametros';

/** Maior página aceita pelo backend; usada para preencher listas de seleção. */
export const TAMANHO_MAXIMO = 100;

@Injectable({ providedIn: 'root' })
export class ProjetoService {
  private readonly http = inject(HttpClient);
  private readonly url = urlApi('/projetos');
  private readonly cache = new CacheEmMemoria<Projeto[]>();

  listar(filtro: FiltroProjetos = {}, paginacao: Paginacao = {}): Observable<Pagina<Projeto>> {
    return this.http.get<Pagina<Projeto>>(this.url, { params: parametros({ ...filtro, ...paginacao }) });
  }

  /**
   * Projetos para campos de seleção (até {@link TAMANHO_MAXIMO}). Ao voltar a uma tela, a lista
   * anterior aparece na hora e é atualizada em segundo plano.
   */
  listarParaSelecao(incluirArquivados = false): Observable<Projeto[]> {
    const lista = this.listar({ incluirArquivados }, { tamanho: TAMANHO_MAXIMO }).pipe(map((pagina) => pagina.itens));
    return this.cache.comAtualizacao(`arquivados=${incluirArquivados}`, lista);
  }

  buscar(id: number): Observable<Projeto> {
    return this.http.get<Projeto>(`${this.url}/${id}`);
  }

  criar(requisicao: SalvarProjetoRequest): Observable<Projeto> {
    return this.http.post<Projeto>(this.url, requisicao).pipe(tap(() => this.cache.limpar()));
  }

  editar(id: number, requisicao: SalvarProjetoRequest): Observable<Projeto> {
    return this.http.put<Projeto>(`${this.url}/${id}`, requisicao).pipe(tap(() => this.cache.limpar()));
  }

  arquivar(id: number): Observable<Projeto> {
    return this.http.post<Projeto>(`${this.url}/${id}/arquivar`, null).pipe(tap(() => this.cache.limpar()));
  }

  desarquivar(id: number): Observable<Projeto> {
    return this.http.post<Projeto>(`${this.url}/${id}/desarquivar`, null).pipe(tap(() => this.cache.limpar()));
  }
}
