import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  AtualizarChamadoRequest,
  Chamado,
  ChamadoResumo,
  CriarChamadoRequest,
  FiltroChamados,
  StatusChamado,
} from '../models/chamado';
import { Pagina, Paginacao, Referencia } from '../models/comum';
import { parametros, urlApi } from './parametros';

@Injectable({ providedIn: 'root' })
export class ChamadoService {
  private readonly http = inject(HttpClient);
  private readonly url = urlApi('/chamados');

  listar(filtro: FiltroChamados, paginacao: Paginacao = {}): Observable<Pagina<ChamadoResumo>> {
    return this.http
      .get<Pagina<ChamadoResumo>>(this.url, { params: parametros({ ...filtro, ...paginacao }) })
      .pipe(map((pagina) => ({ ...pagina, itens: pagina.itens.map(comResponsaveis) })));
  }

  buscar(id: number): Observable<Chamado> {
    return this.http.get<Chamado>(`${this.url}/${id}`).pipe(map(comResponsaveis));
  }

  criar(requisicao: CriarChamadoRequest): Observable<Chamado> {
    return this.http.post<Chamado>(this.url, requisicao).pipe(map(comResponsaveis));
  }

  editar(id: number, requisicao: AtualizarChamadoRequest): Observable<Chamado> {
    return this.http.put<Chamado>(`${this.url}/${id}`, requisicao).pipe(map(comResponsaveis));
  }

  alterarStatus(id: number, status: StatusChamado): Observable<Chamado> {
    return this.http.patch<Chamado>(`${this.url}/${id}/status`, { status }).pipe(map(comResponsaveis));
  }

  atribuirAMim(id: number): Observable<Chamado> {
    return this.http.post<Chamado>(`${this.url}/${id}/atribuir-a-mim`, null).pipe(map(comResponsaveis));
  }

  /** Exclusão lógica (só admin): some para todos, mas continua no banco. */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  reordenar(id: number, posicao: number): Observable<Chamado> {
    return this.http.put<Chamado>(`${this.url}/${id}/posicao`, { posicao }).pipe(map(comResponsaveis));
  }
}

/**
 * Durante o deploy, o backend anterior (responsável único, campo `responsavel`) pode ficar no ar
 * alguns minutos depois do frontend novo; aqui as duas formas viram `responsaveis`.
 */
function comResponsaveis<T extends ChamadoResumo>(chamado: T): T {
  if (Array.isArray(chamado.responsaveis)) {
    return chamado;
  }
  const antigo = (chamado as { responsavel?: Referencia | null }).responsavel;
  return { ...chamado, responsaveis: antigo ? [antigo] : [] };
}
