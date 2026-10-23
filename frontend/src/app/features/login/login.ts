import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfiguracaoService } from '../../core/api/configuracao.service';
import { ApiErro } from '../../core/api/api-erro';
import { AuthService } from '../../core/auth/auth.service';
import { ErroCampo } from '../../shared/formularios/erro-campo';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, ErroCampo],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  /** Query params (`withComponentInputBinding`). */
  readonly retorno = input<string>();
  readonly sessao = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly configuracao = inject(ConfiguracaoService).atual;

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { email, senha } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);
    this.auth.login(email, senha).subscribe({
      next: () => void this.router.navigateByUrl(this.destinoSeguro()),
      error: (erro: unknown) => {
        this.erro.set(ApiErro.mensagemDe(erro));
        this.enviando.set(false);
      },
    });
  }

  /** Só aceita rotas internas como destino (evita redirecionamento aberto). */
  private destinoSeguro(): string {
    const destino = this.retorno();
    return destino && destino.startsWith('/') && !destino.startsWith('//') && !destino.startsWith('/login')
      ? destino
      : '/dashboard';
  }
}
