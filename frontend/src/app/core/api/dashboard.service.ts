import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { MeusChamados, TemposDashboard, TotalPorDesenvolvedor, TotalPorStatus, TotalPorUrgencia } from '../models/dashboard';
import { UltimaAtualizacao } from '../models/feed';
import { parametros, urlApi } from './parametros';

export interface Indicadores {
  meus: MeusChamados;
  porStatus: TotalPorStatus[];
  porUrgencia: TotalPorUrgencia[];
  porDesenvolvedor: TotalPorDesenvolvedor[];
  tempos: TemposDashboard;
}

const LIMITE_ULTIMAS = 8;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = urlApi('/dashboard');

  /** Os indicadores em paralelo, opcionalmente restritos a um projeto. */
  indicadores(projetoId: number | null): Observable<Indicadores> {
    const params = parametros({ projetoId });
    return forkJoin({
      meus: this.http.get<MeusChamados>(`${this.url}/meus-chamados`, { params }),
      porStatus: this.http.get<TotalPorStatus[]>(`${this.url}/por-status`, { params }),
      porUrgencia: this.http.get<TotalPorUrgencia[]>(`${this.url}/por-urgencia`, { params }),
      porDesenvolvedor: this.http.get<TotalPorDesenvolvedor[]>(`${this.url}/por-desenvolvedor`, { params }),
      tempos: this.http.get<TemposDashboard>(`${this.url}/tempos`, { params }),
    });
  }

  /** Acompanhamentos mais recentes nos chamados em que o usuário é responsável ou autor. */
  ultimasAtualizacoes(limite = LIMITE_ULTIMAS): Observable<UltimaAtualizacao[]> {
    return this.http.get<UltimaAtualizacao[]>(`${this.url}/ultimas-atualizacoes`, { params: parametros({ limite }) });
  }
}
