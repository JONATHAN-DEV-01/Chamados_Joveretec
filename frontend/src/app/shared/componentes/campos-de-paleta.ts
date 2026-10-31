import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Paleta } from '../../core/models/configuracao';
import { avisosDeLegibilidade, corHexValida } from '../../core/tema/cores';
import { ErroCampo } from '../formularios/erro-campo';

export type GrupoPaleta = FormGroup<{ [K in keyof Paleta]: FormControl<string> }>;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const MENSAGEM_COR = 'Use o formato #RRGGBB.';

/** Grupo de formulário com as 4 cores, todas obrigatórias no formato `#RRGGBB`. */
export function grupoPaleta(): GrupoPaleta {
  const cor = () => new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(HEX)] });
  return new FormGroup({ fundo: cor(), superficie: cor(), destaque: cor(), texto: cor() });
}

interface CampoCor {
  chave: keyof Paleta;
  rotulo: string;
  uso: string;
}

/**
 * As 4 cores da paleta (seletor + campo hexadecimal) e os avisos de legibilidade. Usado pela
 * paleta do sistema (Configurações) e pela paleta pessoal (Meu perfil).
 */
@Component({
  selector: 'app-campos-de-paleta',
  imports: [ReactiveFormsModule, ErroCampo],
  template: `
    <div class="cores" [formGroup]="grupo()">
      @for (cor of CORES; track cor.chave) {
        <div class="campo">
          <label [for]="'cor-' + cor.chave">{{ cor.rotulo }}</label>
          <div class="seletor-cor">
            <!-- Não usa formControlName: dois inputs no mesmo controle não se atualizam entre si. -->
            <input
              type="color"
              [value]="corDoSeletor(cor.chave)"
              (input)="escolherCor(cor.chave, $event)"
              [disabled]="desabilitado()"
              [attr.aria-label]="'Escolher cor: ' + cor.rotulo"
            />
            <input [id]="'cor-' + cor.chave" type="text" [formControlName]="cor.chave" maxlength="7" spellcheck="false" />
          </div>
          <span class="dica">{{ cor.uso }}</span>
          <app-erro-campo [controle]="grupo().controls[cor.chave]" [mensagemFormato]="MENSAGEM_COR" />
        </div>
      }
    </div>

    @for (aviso of avisos(); track aviso) {
      <p class="alerta" role="status">{{ aviso }}</p>
    }
  `,
  styles: `
    .cores { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--espaco); }
    .seletor-cor { display: flex; gap: 8px; }
    .seletor-cor input[type='color'] { flex: 0 0 44px; width: 44px; padding: 2px; cursor: pointer; }
    .seletor-cor input[type='text'] { font-family: ui-monospace, Consolas, monospace; text-transform: uppercase; }
    .alerta { margin: var(--espaco) 0 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CamposDePaleta {
  readonly grupo = input.required<GrupoPaleta>();
  /** Valor atual do grupo (sinal do pai), para os avisos e os seletores de cor. */
  readonly paleta = input.required<Partial<Paleta>>();
  readonly desabilitado = input(false);

  protected readonly MENSAGEM_COR = MENSAGEM_COR;
  protected readonly CORES: CampoCor[] = [
    { chave: 'fundo', rotulo: 'Fundo', uso: 'Fundo principal e barra lateral' },
    { chave: 'superficie', rotulo: 'Superfície', uso: 'Cartões, bordas e superfícies secundárias' },
    { chave: 'destaque', rotulo: 'Destaque', uso: 'Botões primários, links e urgência Alta/Crítica' },
    { chave: 'texto', rotulo: 'Texto', uso: 'Texto principal' },
  ];

  protected readonly avisos = computed(() => avisosDeLegibilidade(this.paleta()));

  /** Valor para o `<input type="color">`, que só aceita `#rrggbb` (minúsculo). */
  protected corDoSeletor(chave: keyof Paleta): string {
    const valor = this.paleta()[chave];
    return corHexValida(valor) ? valor!.toLowerCase() : '#000000';
  }

  protected escolherCor(chave: keyof Paleta, evento: Event): void {
    const controle = this.grupo().controls[chave];
    controle.setValue((evento.target as HTMLInputElement).value.toUpperCase());
    controle.markAsDirty();
  }
}
