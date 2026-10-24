import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { CarregamentoService } from './core/carregamento/carregamento.service';
import { IndicadorCarregamento } from './core/carregamento/indicador-carregamento';
import { Notificacoes } from './core/notificacao/notificacoes';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Notificacoes, IndicadorCarregamento],
  template: '<app-indicador-carregamento /><router-outlet /><app-notificacoes />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    // Troca de tela também é "carregando" (as telas são lazy-loaded).
    const carregamento = inject(CarregamentoService);
    let encerrar: (() => void) | null = null;
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((evento) => {
        if (evento instanceof NavigationStart) {
          encerrar?.();
          encerrar = carregamento.iniciar();
        } else if (
          evento instanceof NavigationEnd ||
          evento instanceof NavigationCancel ||
          evento instanceof NavigationError
        ) {
          encerrar?.();
          encerrar = null;
        }
      });
  }
}
