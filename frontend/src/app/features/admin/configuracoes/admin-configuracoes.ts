import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfiguracaoService } from '../../../core/api/configuracao.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CONFIGURACAO_PADRAO, Configuracao } from '../../../core/models/configuracao';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { CamposDePaleta, grupoPaleta } from '../../../shared/componentes/campos-de-paleta';
import { PreviaDePaleta } from '../../../shared/componentes/previa-de-paleta';
import { ErroCampo } from '../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../shared/formularios/erros-servidor';

@Component({
  selector: 'app-admin-configuracoes',
  imports: [ReactiveFormsModule, ErroCampo, CamposDePaleta, PreviaDePaleta],
  templateUrl: './admin-configuracoes.html',
  styleUrl: './admin-configuracoes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfiguracoes {
  private readonly servico = inject(ConfiguracaoService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly auth = inject(AuthService);
  /** Com paleta pessoal, a página continua com ela depois de salvar a do sistema. */
  protected readonly temPaletaPessoal = computed(() => !!this.auth.usuario()?.paleta);

  protected readonly salvando = signal(false);

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly formulario = this.fb.group({
    paleta: grupoPaleta(),
    geral: this.fb.group({
      nomeSistema: ['', [Validators.required, Validators.maxLength(60)]],
      tamanhoPaginaPadrao: [20, [Validators.required, Validators.min(5), Validators.max(100)]],
    }),
  });

  protected readonly paleta = toSignal(this.formulario.controls.paleta.valueChanges, {
    initialValue: this.formulario.controls.paleta.getRawValue(),
  });

  constructor() {
    this.preencher(this.servico.atual());
    // Traz a versão mais recente (outro admin pode ter alterado desde que o app abriu).
    this.servico.carregar().subscribe((configuracao) => this.preencher(configuracao));
  }

  protected restaurarPadrao(): void {
    // Só os campos do formulário: a configuração também traz os limites de anexo, que não são editáveis.
    const { paleta, geral } = structuredClone(CONFIGURACAO_PADRAO);
    this.formulario.setValue({ paleta, geral });
    this.formulario.markAsDirty();
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    this.servico.salvar(this.formulario.getRawValue()).subscribe({
      next: (salva) => {
        this.notificacao.sucesso('Configurações salvas e aplicadas.');
        this.preencher(salva);
        this.salvando.set(false);
      },
      error: (erro: unknown) => {
        if (!aplicarErrosDoServidor(this.formulario.controls.paleta, erro)) {
          aplicarErrosDoServidor(this.formulario.controls.geral, erro) || this.notificacao.erro(erro);
        }
        this.salvando.set(false);
      },
    });
  }

  private preencher(configuracao: Configuracao): void {
    this.formulario.reset(structuredClone(configuracao));
  }
}
