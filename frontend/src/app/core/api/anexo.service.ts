import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
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

  /** Registra o anexo (PENDENTE) e recebe a autorização para enviar o arquivo direto ao armazenamento. */
  solicitarEnvio(chamadoId: number, pedido: PedidoDeEnvio): Observable<EnvioAutorizado> {
    return this.http.post<EnvioAutorizado>(urlApi(`/chamados/${chamadoId}/anexos`), pedido);
  }

  confirmar(anexoId: number): Observable<Anexo> {
    return this.http.post<Anexo>(urlApi(`/anexos/${anexoId}/confirmar`), null);
  }

  /** Link assinado de curta duração (absoluto). `inline` para pré-visualizar imagens. */
  linkDeDownload(anexoId: number, inline = false): Observable<string> {
    return this.http
      .get<{ url: string }>(urlApi(`/anexos/${anexoId}/download`), { params: parametros({ inline }) })
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
