import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { VERSAO_ATUAL_DAS_NOVIDADES } from './novidades';

/** Abre e fecha o pop-up "Novidades da plataforma" e registra que o usuário já o viu. */
@Injectable({ providedIn: 'root' })
export class NovidadesService {
  private readonly auth = inject(AuthService);
  private readonly _aberto = signal(false);

  readonly aberto = this._aberto.asReadonly();

  /** Há uma versão mais nova do que a última que o usuário logado viu. */
  readonly pendentes = computed(() => {
    const usuario = this.auth.usuario();
    return !!usuario && (usuario.novidadesVistasVersao ?? 0) < VERSAO_ATUAL_DAS_NOVIDADES;
  });

  abrir(): void {
    this._aberto.set(true);
  }

  /** Fechar de qualquer jeito (Entendi, X, Esc, clique fora ou atalho) conta como visto. */
  fechar(): void {
    this._aberto.set(false);
    if (this.pendentes()) {
      this.auth.marcarNovidadesVistas(VERSAO_ATUAL_DAS_NOVIDADES).subscribe();
    }
  }
}
