import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ConfiguracaoService } from '../../core/api/configuracao.service';
import { AuthService } from '../../core/auth/auth.service';
import { Paleta } from '../../core/models/configuracao';
import { NotificacaoService } from '../../core/notificacao/notificacao.service';
import { CamposDePaleta, grupoPaleta } from '../../shared/componentes/campos-de-paleta';
import { PreviaDePaleta } from '../../shared/componentes/previa-de-paleta';
import { ErroCampo } from '../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../shared/formularios/erros-servidor';
import { RotuloPerfilPipe } from '../../shared/rotulos';

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const { novaSenha, confirmacao } = grupo.value as { novaSenha: string; confirmacao: string };
  return confirmacao && novaSenha !== confirmacao ? { senhasDiferentes: true } : null;
}

/** Dados do usuário, paleta de cores pessoal e troca de senha. */
@Component({
  selector: 'app-meu-perfil',
  imports: [ReactiveFormsModule, ErroCampo, RotuloPerfilPipe, CamposDePaleta, PreviaDePaleta],
  templateUrl: './meu-perfil.html',
  styleUrl: './meu-perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeuPerfil {
  protected readonly auth = inject(AuthService);
  private readonly configuracao = inject(ConfiguracaoService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly nomeSistema = () => this.configuracao.atual().geral.nomeSistema;

  // ---- Paleta pessoal ----
  protected readonly formularioPaleta = grupoPaleta();
  protected readonly paleta = toSignal(this.formularioPaleta.valueChanges, {
    initialValue: this.formularioPaleta.getRawValue(),
  });
  /** "Restaurar padrão" pendente: ao salvar, a paleta pessoal é removida (segue a do sistema). */
  protected readonly restaurando = signal(false);
  protected readonly salvandoPaleta = signal(false);

  // ---- Senha ----
  protected readonly salvandoSenha = signal(false);
  protected readonly formularioSenha = this.fb.group(
    {
      senhaAtual: ['', Validators.required],
      novaSenha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacao: ['', Validators.required],
    },
    { validators: senhasIguais },
  );

  constructor() {
    this.preencherPaleta();
    // Escolher uma cor depois de "Restaurar padrão" volta a ser uma paleta pessoal.
    this.formularioPaleta.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.restaurando.set(false));
  }

  protected usaPaletaPessoal(): boolean {
    return !!this.auth.usuario()?.paleta;
  }

  protected restaurarPadrao(): void {
    this.formularioPaleta.setValue({ ...this.configuracao.atual().paleta });
    this.formularioPaleta.markAsDirty();
    this.restaurando.set(true);
  }

  protected salvarPaleta(): void {
    if (this.formularioPaleta.invalid) {
      this.formularioPaleta.markAllAsTouched();
      return;
    }
    this.salvandoPaleta.set(true);
    const pedido: Observable<unknown> = this.restaurando()
      ? this.auth.restaurarPaleta()
      : this.auth.salvarPaleta(this.formularioPaleta.getRawValue());
    const mensagem = this.restaurando() ? 'Você voltou a usar a paleta padrão do sistema.' : 'Sua paleta foi salva e aplicada.';
    pedido.subscribe({
      next: () => {
        this.notificacao.sucesso(mensagem);
        this.preencherPaleta();
        this.salvandoPaleta.set(false);
      },
      error: (erro: unknown) => {
        if (!aplicarErrosDoServidor(this.formularioPaleta, erro)) {
          this.notificacao.erro(erro);
        }
        this.salvandoPaleta.set(false);
      },
    });
  }

  protected salvarSenha(): void {
    if (this.formularioSenha.invalid) {
      this.formularioSenha.markAllAsTouched();
      return;
    }
    const { senhaAtual, novaSenha } = this.formularioSenha.getRawValue();
    this.salvandoSenha.set(true);
    this.auth.alterarSenha(senhaAtual, novaSenha).subscribe({
      next: () => {
        this.notificacao.sucesso('Senha alterada.');
        this.formularioSenha.reset();
        this.salvandoSenha.set(false);
      },
      error: (erro: unknown) => {
        if (!aplicarErrosDoServidor(this.formularioSenha, erro)) {
          this.notificacao.erro(erro);
        }
        this.salvandoSenha.set(false);
      },
    });
  }

  /** A paleta pessoal, se houver; senão, a do sistema (ponto de partida para personalizar). */
  private preencherPaleta(): void {
    const atual: Paleta = this.auth.usuario()?.paleta ?? this.configuracao.atual().paleta;
    this.formularioPaleta.reset({ ...atual });
    this.restaurando.set(false);
  }
}
