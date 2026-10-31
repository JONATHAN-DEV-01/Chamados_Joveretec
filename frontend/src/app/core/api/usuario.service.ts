import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { Pagina, Paginacao } from '../models/comum';
import { AtualizarUsuarioRequest, CriarUsuarioRequest, FiltroUsuarios, Usuario } from '../models/usuario';
import { CacheEmMemoria } from './cache-em-memoria';
import { parametros, urlApi } from './parametros';
import { TAMANHO_MAXIMO } from './projeto.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly url = urlApi('/usuarios');
  private readonly cache = new CacheEmMemoria<Usuario[]>();

  listar(filtro: FiltroUsuarios = {}, paginacao: Paginacao = {}): Observable<Pagina<Usuario>> {
    // `ativo=false` é um filtro válido, então não pode ser descartado como "vazio".
    const ativo = filtro.ativo === null || filtro.ativo === undefined ? null : String(filtro.ativo);
    return this.http.get<Pagina<Usuario>>(this.url, {
      params: parametros({ busca: filtro.busca, perfil: filtro.perfil, ativo, ...paginacao }),
    });
  }

  /**
   * Usuários ativos para escolher responsável (até {@link TAMANHO_MAXIMO}). Ao voltar a uma tela,
   * a lista anterior aparece na hora e é atualizada em segundo plano.
   */
  listarAtivos(): Observable<Usuario[]> {
    const lista = this.listar({ ativo: true }, { tamanho: TAMANHO_MAXIMO }).pipe(map((pagina) => pagina.itens));
    return this.cache.comAtualizacao('ativos', lista);
  }

  criar(requisicao: CriarUsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, requisicao).pipe(tap(() => this.cache.limpar()));
  }

  editar(id: number, requisicao: AtualizarUsuarioRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, requisicao).pipe(tap(() => this.cache.limpar()));
  }

  desativar(id: number): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/${id}/desativar`, null).pipe(tap(() => this.cache.limpar()));
  }

  reativar(id: number): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/${id}/reativar`, null).pipe(tap(() => this.cache.limpar()));
  }
}
