import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SEM_INDICADOR } from '../carregamento/carregamento.service';
import { Anexo, EnvioAutorizado } from '../models/feed';
import { parametros, urlApi } from './parametros';

export interface PedidoDeEnvio {
  nome: string;
  tipoMime: string;
  tamanhoBytes: number;
  /** Rascunho de acompanhamento; `null` para anexar à abertura do chamado. */
  acompanhamentoId: number | null;
}

@Injectable({ providedIn: 'root' })
export class AnexoService {
  private readonly http = inject(HttpClient);

  /**
   * Registra o anexo (PENDENTE) e recebe a autorização para enviar o arquivo direto ao armazenamento.
   * Sem `chamadoId` (chamado ainda sendo escrito), o anexo nasce como rascunho e é ligado na criação.
   */
  solicitarEnvio(chamadoId: number | null, pedido: PedidoDeEnvio): Observable<EnvioAutorizado> {
    const url = chamadoId === null ? urlApi('/anexos/rascunhos') : urlApi(`/chamados/${chamadoId}/anexos`);
    return this.http.post<EnvioAutorizado>(url, pedido);
  }

  /** Links assinados de vários anexos numa chamada só (miniaturas no texto), por id. */
  links(anexoIds: number[], inline = true): Observable<Map<number, string>> {
    return this.http
      .get<{ anexoId: number; url: string }[]>(urlApi('/anexos/links'), {
        params: parametros({ ids: anexoIds.join(','), inline }),
        context: new HttpContext().set(SEM_INDICADOR, true),
      })
      .pipe(map((links) => new Map(links.map(({ anexoId, url }) => [anexoId, urlAbsoluta(url)]))));
  }

  confirmar(anexoId: number): Observable<Anexo> {
    return this.http.post<Anexo>(urlApi(`/anexos/${anexoId}/confirmar`), null);
  }

  /** Link assinado de curta duração (absoluto). `inline` para pré-visualizar imagens. */
  linkDeDownload(anexoId: number, inline = false): Observable<string> {
    return this.http
      .get<{ url: string }>(urlApi(`/anexos/${anexoId}/download`), {
        params: parametros({ inline }),
        // Prévias de imagem carregam em segundo plano, sem acionar o indicador global.
        context: new HttpContext().set(SEM_INDICADOR, inline),
      })
      .pipe(map(({ url }) => urlAbsoluta(url)));
  }

  excluir(anexoId: number): Observable<void> {
    return this.http.delete<void>(urlApi(`/anexos/${anexoId}`));
  }
}

/** URLs do armazenamento local vêm relativas ao backend (`/api/...`); as do Supabase já são absolutas. */
export function urlAbsoluta(url: string): string {
  return url.startsWith('/') ? `${environment.apiUrl}${url}` : url;
}
