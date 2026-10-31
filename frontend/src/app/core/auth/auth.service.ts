import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { urlApi } from '../api/parametros';
import { Paleta } from '../models/configuracao';
import { LoginResponse, Usuario } from '../models/usuario';

interface Sessao {
  token: string;
  expiraEm: string;
  usuario: Usuario;
}

const CHAVE_SESSAO = 'chamados.sessao';

/**
 * Sessão do usuário. O token fica em `sessionStorage` (some ao fechar a aba) e expira
 * no horário informado pelo backend; não há refresh token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessao = signal<Sessao | null>(lerSessao());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly isAdmin = computed(() => this.usuario()?.perfil === 'ADMIN');

  /** Token válido (não expirado) ou `null`; uma sessão expirada é descartada aqui. */
  token(): string | null {
    const atual = this.sessao();
    if (!atual) {
      return null;
    }
    if (Date.parse(atual.expiraEm) <= Date.now()) {
      this.encerrar();
      return null;
    }
    return atual.token;
  }

  autenticado(): boolean {
    return this.token() !== null;
  }

  login(email: string, senha: string): Observable<Usuario> {
    return this.http.post<LoginResponse>(urlApi('/auth/login'), { email: email.trim(), senha }).pipe(
      tap(({ token, expiraEm, usuario }) => this.guardar({ token, expiraEm, usuario })),
      map(({ usuario }) => usuario),
    );
  }

  /** Atualiza os dados do usuário logado (ex.: perfil alterado por um admin). */
  recarregarUsuario(): Observable<Usuario> {
    return this.http.get<Usuario>(urlApi('/auth/me')).pipe(tap((usuario) => this.atualizarUsuario(usuario)));
  }

  /** Salva a paleta pessoal; a sessão é atualizada e o tema muda na hora. */
  salvarPaleta(paleta: Paleta): Observable<Paleta> {
    return this.http.put<Paleta>(urlApi('/auth/me/paleta'), paleta).pipe(tap((salva) => this.trocarPaleta(salva)));
  }

  /** Remove a paleta pessoal: volta a seguir a paleta do sistema. */
  restaurarPaleta(): Observable<void> {
    return this.http.delete<void>(urlApi('/auth/me/paleta')).pipe(tap(() => this.trocarPaleta(null)));
  }

  /**
   * Registra que o usuário viu as novidades até `versao`: na sessão na hora (o pop-up não volta
   * nesta aba) e no servidor em seguida. Uma falha no servidor só faz o pop-up reaparecer no
   * próximo login, então não é tratada como erro.
   */
  marcarNovidadesVistas(versao: number): Observable<void> {
    const usuario = this.usuario();
    if (usuario) {
      this.atualizarUsuario({ ...usuario, novidadesVistasVersao: Math.max(versao, usuario.novidadesVistasVersao ?? 0) });
    }
    return this.http.put<unknown>(urlApi('/auth/me/novidades'), { versao }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  alterarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
    return this.http.put<void>(urlApi('/auth/me/senha'), { senhaAtual, novaSenha });
  }

  atualizarUsuario(usuario: Usuario): void {
    const atual = this.sessao();
    if (atual && atual.usuario.id === usuario.id) {
      this.guardar({ ...atual, usuario });
    }
  }

  encerrar(): void {
    this.sessao.set(null);
    armazenamento()?.removeItem(CHAVE_SESSAO);
  }

  private trocarPaleta(paleta: Paleta | null): void {
    const usuario = this.usuario();
    if (usuario) {
      this.atualizarUsuario({ ...usuario, paleta });
    }
  }

  private guardar(sessao: Sessao): void {
    this.sessao.set(sessao);
    armazenamento()?.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  }
}

function armazenamento(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function lerSessao(): Sessao | null {
  try {
    const bruto = armazenamento()?.getItem(CHAVE_SESSAO);
    return bruto ? (JSON.parse(bruto) as Sessao) : null;
  } catch {
    return null;
  }
}
