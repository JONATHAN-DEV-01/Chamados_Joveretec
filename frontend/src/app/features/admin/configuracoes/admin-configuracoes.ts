import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfiguracaoService } from '../../../core/api/configuracao.service';
import { CONFIGURACAO_PADRAO, Configuracao, Paleta } from '../../../core/models/configuracao';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { contraste, corHexValida } from '../../../core/tema/cores';
import { TemaService } from '../../../core/tema/tema.service';
import { BadgeUrgencia } from '../../../shared/componentes/badges';
import { ErroCampo } from '../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../shared/formularios/erros-servidor';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const MENSAGEM_COR = 'Use o formato #RRGGBB.';

interface CampoCor {
  chave: keyof Paleta;
  rotulo: string;
  uso: string;
}

@Component({
  selector: 'app-admin-configuracoes',
  imports: [ReactiveFormsModule, ErroCampo, BadgeUrgencia],
  templateUrl: './admin-configuracoes.html',
  styleUrl: './admin-configuracoes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfiguracoes {
  private readonly servico = inject(ConfiguracaoService);
  private readonly tema = inject(TemaService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly previa = viewChild.required<ElementRef<HTMLElement>>('previa');

  protected readonly MENSAGEM_COR = MENSAGEM_COR;
  protected readonly CORES: CampoCor[] = [
    { chave: 'fundo', rotulo: 'Fundo', uso: 'Fundo principal e barra lateral' },
    { chave: 'superficie', rotulo: 'Superfície', uso: 'Cartões, bordas e superfícies secundárias' },
    { chave: 'destaque', rotulo: 'Destaque', uso: 'Botões primários, links e urgência Alta/Crítica' },
    { chave: 'texto', rotulo: 'Texto', uso: 'Texto principal' },
  ];

  protected readonly salvando = signal(false);

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly formulario = this.fb.group({
    paleta: this.fb.group({
      fundo: ['', [Validators.required, Validators.pattern(HEX)]],
      superficie: ['', [Validators.required, Validators.pattern(HEX)]],
      destaque: ['', [Validators.required, Validators.pattern(HEX)]],
      texto: ['', [Validators.required, Validators.pattern(HEX)]],
    }),
    geral: this.fb.group({
      nomeSistema: ['', [Validators.required, Validators.maxLength(60)]],
      tamanhoPaginaPadrao: [20, [Validators.required, Validators.min(5), Validators.max(100)]],
    }),
  });

  private readonly paleta = toSignal(this.formulario.controls.paleta.valueChanges, {
    initialValue: this.formulario.controls.paleta.getRawValue(),
  });

  /** Avisos de legibilidade (WCAG): texto ≥ 4,5:1 e destaque ≥ 3:1 sobre o fundo. */
  protected readonly avisos = computed(() => {
    const { fundo, texto, destaque } = this.paleta();
    if (![fundo, texto, destaque].every(corHexValida)) {
      return [];
    }
    const avisos: string[] = [];
    if (contraste(texto!, fundo!) < 4.5) {
      avisos.push('O texto tem pouco contraste com o fundo e pode ficar difícil de ler.');
    }
    if (contraste(destaque!, fundo!) < 3) {
      avisos.push('A cor de destaque se confunde com o fundo (botões e urgências perdem visibilidade).');
    }
    return avisos;
  });

  constructor() {
    this.preencher(this.servico.atual());
    // Traz a versão mais recente (outro admin pode ter alterado desde que o app abriu).
    this.servico.carregar().subscribe((configuracao) => this.preencher(configuracao));
    // Depois de renderizar: a prévia é um elemento do template.
    afterRenderEffect(() => {
      const paleta = this.paleta();
      if (Object.values(paleta).every(corHexValida)) {
        this.tema.aplicar(paleta as Paleta, this.previa().nativeElement);
      }
    });
  }

  /** Valor para o `<input type="color">`, que só aceita `#rrggbb` (minúsculo). */
  protected corDoSeletor(chave: keyof Paleta): string {
    const valor = this.paleta()[chave];
    return corHexValida(valor) ? valor!.toLowerCase() : '#000000';
  }

  protected escolherCor(chave: keyof Paleta, evento: Event): void {
    const controle = this.formulario.controls.paleta.controls[chave];
    controle.setValue((evento.target as HTMLInputElement).value.toUpperCase());
    controle.markAsDirty();
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
