import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Pagina, Paginacao } from '../models/comum';
import { AtualizarUsuarioRequest, CriarUsuarioRequest, FiltroUsuarios, Usuario } from '../models/usuario';
import { parametros, urlApi } from './parametros';
import { TAMANHO_MAXIMO } from './projeto.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly url = urlApi('/usuarios');

  listar(filtro: FiltroUsuarios = {}, paginacao: Paginacao = {}): Observable<Pagina<Usuario>> {
    // `ativo=false` é um filtro válido, então não pode ser descartado como "vazio".
    const ativo = filtro.ativo === null || filtro.ativo === undefined ? null : String(filtro.ativo);
    return this.http.get<Pagina<Usuario>>(this.url, {
      params: parametros({ busca: filtro.busca, perfil: filtro.perfil, ativo, ...paginacao }),
    });
  }

  /** Usuários ativos para escolher responsável (até {@link TAMANHO_MAXIMO}). */
  listarAtivos(): Observable<Usuario[]> {
    return this.listar({ ativo: true }, { tamanho: TAMANHO_MAXIMO }).pipe(map((pagina) => pagina.itens));
  }

  criar(requisicao: CriarUsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, requisicao);
  }

  editar(id: number, requisicao: AtualizarUsuarioRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, requisicao);
  }

  desativar(id: number): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/${id}/desativar`, null);
  }

  reativar(id: number): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/${id}/reativar`, null);
  }
}
