import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Referencia } from '../../core/models/comum';
import { Usuario } from '../../core/models/usuario';

/**
 * Select de responsável: "ninguém", "eu mesmo" (autoatribuição) ou outro usuário ativo.
 * O valor do controle é o id como texto ('' = sem responsável).
 */
@Component({
  selector: 'app-seletor-responsavel',
  imports: [ReactiveFormsModule],
  template: `
    <select [id]="idCampo()" [formControl]="controle()">
      <option value="">Sem responsável</option>
      @if (eu(); as usuario) {
        <option [value]="String(usuario.id)">Eu mesmo ({{ usuario.nome }})</option>
      }
      @for (usuario of outros(); track usuario.id) {
        <option [value]="String(usuario.id)">{{ usuario.nome }}</option>
      }
      @if (atualInativo(); as inativo) {
        <option [value]="String(inativo.id)">{{ inativo.nome }} (inativo)</option>
      }
    </select>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeletorResponsavel {
  readonly controle = input.required<FormControl<string>>();
  readonly idCampo = input('responsavel');
  readonly usuarios = input.required<Usuario[]>();
  readonly eu = input<Usuario | null>(null);
  /** Responsável atual (edição): se estiver inativo, continua aparecendo como opção. */
  readonly atual = input<Referencia | null>(null);

  protected readonly String = String;
  protected readonly outros = computed(() => this.usuarios().filter((u) => u.id !== this.eu()?.id));
  protected readonly atualInativo = computed(() => {
    const atual = this.atual();
    const listado = atual && (atual.id === this.eu()?.id || this.usuarios().some((u) => u.id === atual.id));
    return atual && !listado ? atual : null;
  });
}
