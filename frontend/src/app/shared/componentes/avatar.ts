import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { iniciais } from '../formatos';

/** Círculo com as iniciais do nome. */
@Component({
  selector: 'app-avatar',
  template: `<span [attr.title]="nome()" aria-hidden="true">{{ texto() }}</span>`,
  styles: `
    :host { display: inline-flex; flex: none; }
    span {
      display: inline-grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid var(--cor-borda);
      border-radius: 50%;
      background: var(--cor-painel-forte);
      color: var(--cor-texto);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly nome = input.required<string>();
  protected readonly texto = computed(() => iniciais(this.nome()));
}
