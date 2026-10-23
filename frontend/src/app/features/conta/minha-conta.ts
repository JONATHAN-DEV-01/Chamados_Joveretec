import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { NotificacaoService } from '../../core/notificacao/notificacao.service';
import { ErroCampo } from '../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../shared/formularios/erros-servidor';
import { RotuloPerfilPipe } from '../../shared/rotulos';

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const { novaSenha, confirmacao } = grupo.value as { novaSenha: string; confirmacao: string };
  return confirmacao && novaSenha !== confirmacao ? { senhasDiferentes: true } : null;
}

@Component({
  selector: 'app-minha-conta',
  imports: [ReactiveFormsModule, ErroCampo, RotuloPerfilPipe],
  template: `
    <h1>Minha conta</h1>
    @if (auth.usuario(); as usuario) {
      <section class="cartao dados">
        <div><span class="rotulo">Nome</span><p>{{ usuario.nome }}</p></div>
        <div><span class="rotulo">E-mail</span><p>{{ usuario.email }}</p></div>
        <div><span class="rotulo">Perfil</span><p>{{ usuario.perfil | rotuloPerfil }}</p></div>
      </section>
    }

    <section class="cartao">
      <h2>Alterar senha</h2>
      <form [formGroup]="formulario" (ngSubmit)="salvar()" novalidate>
        <div class="campo">
          <label for="senhaAtual">Senha atual</label>
          <input id="senhaAtual" type="password" formControlName="senhaAtual" autocomplete="current-password" />
          <app-erro-campo [controle]="formulario.controls.senhaAtual" />
        </div>
        <div class="campo">
          <label for="novaSenha">Nova senha</label>
          <input id="novaSenha" type="password" formControlName="novaSenha" autocomplete="new-password" />
          <span class="dica">Entre 8 e 72 caracteres.</span>
          <app-erro-campo [controle]="formulario.controls.novaSenha" />
        </div>
        <div class="campo">
          <label for="confirmacao">Confirmar nova senha</label>
          <input id="confirmacao" type="password" formControlName="confirmacao" autocomplete="new-password" />
          @if (formulario.hasError('senhasDiferentes') && formulario.controls.confirmacao.touched) {
            <span class="erro" role="alert">As senhas não conferem.</span>
          }
        </div>
        <div class="acoes">
          <button type="submit" class="btn btn-primario" [disabled]="salvando()">Alterar senha</button>
        </div>
      </form>
    </section>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: var(--espaco); max-width: 560px; }
    h1 { margin: 0; }
    .dados { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .dados p { margin: 2px 0 0; overflow-wrap: anywhere; }
    form { display: flex; flex-direction: column; gap: 14px; }
    .erro { color: var(--cor-destaque); font-size: 0.8rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinhaConta {
  protected readonly auth = inject(AuthService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly salvando = signal(false);

  protected readonly formulario = inject(NonNullableFormBuilder).group(
    {
      senhaAtual: ['', Validators.required],
      novaSenha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacao: ['', Validators.required],
    },
    { validators: senhasIguais },
  );

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { senhaAtual, novaSenha } = this.formulario.getRawValue();
    this.salvando.set(true);
    this.auth.alterarSenha(senhaAtual, novaSenha).subscribe({
      next: () => {
        this.notificacao.sucesso('Senha alterada.');
        this.formulario.reset();
        this.salvando.set(false);
      },
      error: (erro: unknown) => {
        if (!aplicarErrosDoServidor(this.formulario, erro)) {
          this.notificacao.erro(erro);
        }
        this.salvando.set(false);
      },
    });
  }
}
