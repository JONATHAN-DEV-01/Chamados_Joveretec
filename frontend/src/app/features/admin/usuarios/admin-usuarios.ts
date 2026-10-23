import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, merge } from 'rxjs';
import { UsuarioService } from '../../../core/api/usuario.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Perfil, Usuario } from '../../../core/models/usuario';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { buscaComAtraso } from '../../../shared/busca-com-atraso';
import { carregarComParametros } from '../../../shared/carregamento';
import { BotaoConfirmar } from '../../../shared/componentes/botao-confirmar';
import { Paginacao } from '../../../shared/componentes/paginacao';
import { ErroCampo } from '../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../shared/formularios/erros-servidor';
import { ROTULO_PERFIL, RotuloPerfilPipe } from '../../../shared/rotulos';

const SENHA = [Validators.minLength(8), Validators.maxLength(72)];

@Component({
  selector: 'app-admin-usuarios',
  imports: [ReactiveFormsModule, ErroCampo, Paginacao, BotaoConfirmar, RotuloPerfilPipe],
  templateUrl: './admin-usuarios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsuarios {
  private readonly usuarios = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly usuarioLogado = this.auth.usuario;
  protected readonly PERFIS = Object.keys(ROTULO_PERFIL) as Perfil[];

  protected readonly campoBusca = new FormControl('', { nonNullable: true });
  protected readonly campoPerfil = new FormControl<Perfil | ''>('', { nonNullable: true });
  protected readonly campoAtivo = new FormControl<'' | 'true' | 'false'>('true', { nonNullable: true });
  protected readonly pagina = signal(0);

  private readonly busca = buscaComAtraso(this.campoBusca);
  private readonly perfil = signalDe(this.campoPerfil);
  private readonly ativo = signalDe(this.campoAtivo);

  private readonly consulta = computed(() => ({
    filtro: {
      busca: this.busca(),
      perfil: this.perfil() || null,
      ativo: this.ativo() === '' ? null : this.ativo() === 'true',
    },
    pagina: this.pagina(),
  }));
  protected readonly lista = carregarComParametros(this.consulta, ({ filtro, pagina }) =>
    this.usuarios.listar(filtro, { pagina }),
  );

  protected readonly emEdicao = signal<Usuario | null>(null);
  protected readonly salvando = signal(false);
  protected readonly formulario = inject(NonNullableFormBuilder).group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    perfil: ['DESENVOLVEDOR' as Perfil, Validators.required],
    senha: ['', [Validators.required, ...SENHA]],
  });

  constructor() {
    merge(this.campoBusca.valueChanges, this.campoPerfil.valueChanges, this.campoAtivo.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.pagina.set(0));
  }

  protected novo(): void {
    this.emEdicao.set(null);
    this.formulario.controls.senha.setValidators([Validators.required, ...SENHA]);
    this.formulario.reset();
  }

  protected editar(usuario: Usuario): void {
    this.emEdicao.set(usuario);
    // Na edição a senha é opcional: preenchida, redefine a senha do usuário.
    this.formulario.controls.senha.setValidators(SENHA);
    this.formulario.reset({ nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, senha: '' });
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { nome, email, perfil, senha } = this.formulario.getRawValue();
    const usuario = this.emEdicao();
    const operacao = usuario
      ? this.usuarios.editar(usuario.id, { nome: nome.trim(), email: email.trim(), perfil, novaSenha: senha || null })
      : this.usuarios.criar({ nome: nome.trim(), email: email.trim(), perfil, senha });
    this.salvando.set(true);
    operacao.subscribe({
      next: (salvo) => {
        this.notificacao.sucesso(usuario ? 'Usuário atualizado.' : `Usuário "${salvo.nome}" criado.`);
        this.auth.atualizarUsuario(salvo);
        this.novo();
        this.salvando.set(false);
        this.lista.recarregar();
      },
      error: (erro: unknown) => {
        // Na edição o backend chama o campo de `novaSenha`; no formulário ele é `senha`.
        if (!aplicarErrosDoServidor(this.formulario, erro, { novaSenha: 'senha' })) {
          this.notificacao.erro(erro);
        }
        this.salvando.set(false);
      },
    });
  }

  protected desativar(usuario: Usuario): void {
    this.executar(this.usuarios.desativar(usuario.id), `Usuário "${usuario.nome}" desativado.`);
  }

  protected reativar(usuario: Usuario): void {
    this.executar(this.usuarios.reativar(usuario.id), `Usuário "${usuario.nome}" reativado.`);
  }

  private executar(operacao: Observable<Usuario>, sucesso: string): void {
    operacao.subscribe({
      next: () => {
        this.notificacao.sucesso(sucesso);
        this.lista.recarregar();
      },
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }
}

function signalDe<T>(controle: FormControl<T>) {
  const valor = signal(controle.value);
  controle.valueChanges.pipe(takeUntilDestroyed()).subscribe((novo) => valor.set(novo));
  return valor.asReadonly();
}
