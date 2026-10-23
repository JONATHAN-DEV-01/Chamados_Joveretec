import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { MeusChamados, TotalPorDesenvolvedor, TotalPorStatus, TotalPorUrgencia } from '../models/dashboard';
import { parametros, urlApi } from './parametros';

export interface Indicadores {
  meus: MeusChamados;
  porStatus: TotalPorStatus[];
  porUrgencia: TotalPorUrgencia[];
  porDesenvolvedor: TotalPorDesenvolvedor[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = urlApi('/dashboard');

  /** Os quatro indicadores em paralelo, opcionalmente restritos a um projeto. */
  indicadores(projetoId: number | null): Observable<Indicadores> {
    const params = parametros({ projetoId });
    return forkJoin({
      meus: this.http.get<MeusChamados>(`${this.url}/meus-chamados`, { params }),
      porStatus: this.http.get<TotalPorStatus[]>(`${this.url}/por-status`, { params }),
      porUrgencia: this.http.get<TotalPorUrgencia[]>(`${this.url}/por-urgencia`, { params }),
      porDesenvolvedor: this.http.get<TotalPorDesenvolvedor[]>(`${this.url}/por-desenvolvedor`, { params }),
    });
  }
}
