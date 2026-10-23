import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificacaoService } from './notificacao.service';

@Component({
  selector: 'app-notificacoes',
  template: `
    <div class="pilha" aria-live="polite">
      @for (item of servico.itens(); track item.id) {
        <div class="aviso" [class.erro]="item.tipo === 'erro'" [attr.role]="item.tipo === 'erro' ? 'alert' : 'status'">
          <span>{{ item.mensagem }}</span>
          <button type="button" class="btn btn-fantasma btn-pequeno" (click)="servico.remover(item.id)">
            <span aria-hidden="true">✕</span><span class="sr-only">Fechar aviso</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .pilha {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: min(380px, calc(100vw - 32px));
    }
    .aviso {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 8px 10px 14px;
      border: 1px solid var(--cor-borda);
      border-left: 4px solid var(--cor-sucesso);
      border-radius: var(--raio);
      background: var(--cor-painel-forte);
      box-shadow: var(--sombra);
    }
    .aviso.erro {
      border-left-color: var(--cor-destaque);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notificacoes {
  protected readonly servico = inject(NotificacaoService);
}
