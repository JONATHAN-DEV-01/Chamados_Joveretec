import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusChamado, Urgencia } from '../../core/models/chamado';
import { RotuloStatusPipe, RotuloUrgenciaPipe } from '../rotulos';

const ESTILO_BASE = `
  :host { display: inline-flex; }
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border: 1px solid var(--cor-borda);
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
  }
`;

/** Urgência com destaque visual: Crítica preenchida e Alta contornada na cor de destaque. */
@Component({
  selector: 'app-badge-urgencia',
  imports: [RotuloUrgenciaPipe],
  template: `<span [class]="'u-' + urgencia().toLowerCase()">{{ urgencia() | rotuloUrgencia }}</span>`,
  styles: `
    ${ESTILO_BASE}
    .u-critica { border-color: var(--cor-destaque); background: var(--cor-destaque); color: var(--cor-sobre-destaque); }
    .u-alta { border-color: var(--cor-destaque); color: var(--cor-destaque); }
    .u-media { color: var(--cor-texto); }
    .u-baixa { border-style: dashed; color: var(--cor-texto-suave); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeUrgencia {
  readonly urgencia = input.required<Urgencia>();
}

@Component({
  selector: 'app-badge-status',
  imports: [RotuloStatusPipe],
  template: `<span [class]="'s-' + status().toLowerCase()"><i aria-hidden="true"></i>{{ status() | rotuloStatus }}</span>`,
  styles: `
    ${ESTILO_BASE}
    span { font-weight: 500; }
    i { width: 8px; height: 8px; border-radius: 50%; background: var(--serie-aberto); }
    .s-em_andamento i { background: var(--serie-andamento); }
    .s-concluido i { background: var(--serie-concluido); }
    .s-concluido { color: var(--cor-texto-suave); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeStatus {
  readonly status = input.required<StatusChamado>();
}
