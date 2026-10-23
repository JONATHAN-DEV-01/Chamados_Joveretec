import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AtualizarChamadoRequest,
  Chamado,
  ChamadoResumo,
  CriarChamadoRequest,
  FiltroChamados,
  Historico,
  StatusChamado,
} from '../models/chamado';
import { Pagina, Paginacao } from '../models/comum';
import { parametros, urlApi } from './parametros';

@Injectable({ providedIn: 'root' })
export class ChamadoService {
  private readonly http = inject(HttpClient);
  private readonly url = urlApi('/chamados');

  listar(filtro: FiltroChamados, paginacao: Paginacao = {}): Observable<Pagina<ChamadoResumo>> {
    return this.http.get<Pagina<ChamadoResumo>>(this.url, {
      params: parametros({ ...filtro, ...paginacao }),
    });
  }

  buscar(id: number): Observable<Chamado> {
    return this.http.get<Chamado>(`${this.url}/${id}`);
  }

  criar(requisicao: CriarChamadoRequest): Observable<Chamado> {
    return this.http.post<Chamado>(this.url, requisicao);
  }

  editar(id: number, requisicao: AtualizarChamadoRequest): Observable<Chamado> {
    return this.http.put<Chamado>(`${this.url}/${id}`, requisicao);
  }

  alterarStatus(id: number, status: StatusChamado): Observable<Chamado> {
    return this.http.patch<Chamado>(`${this.url}/${id}/status`, { status });
  }

  atribuirAMim(id: number): Observable<Chamado> {
    return this.http.post<Chamado>(`${this.url}/${id}/atribuir-a-mim`, null);
  }

  reordenar(id: number, posicao: number): Observable<Chamado> {
    return this.http.put<Chamado>(`${this.url}/${id}/posicao`, { posicao });
  }

  historico(id: number, paginacao: Paginacao = {}): Observable<Pagina<Historico>> {
    return this.http.get<Pagina<Historico>>(`${this.url}/${id}/historico`, { params: parametros({ ...paginacao }) });
  }
}
