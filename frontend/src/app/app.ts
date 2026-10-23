import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Notificacoes } from './core/notificacao/notificacoes';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Notificacoes],
  template: '<router-outlet /><app-notificacoes />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
