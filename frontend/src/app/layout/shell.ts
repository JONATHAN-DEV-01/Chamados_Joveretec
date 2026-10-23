import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ConfiguracaoService } from '../core/api/configuracao.service';

interface ItemMenu {
  rota: string;
  rotulo: string;
}

/** Estrutura das telas autenticadas: barra lateral, cabeçalho e conteúdo. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly configuracao = inject(ConfiguracaoService).atual;
  protected readonly menuAberto = signal(false);

  protected readonly menuPrincipal: ItemMenu[] = [
    { rota: '/dashboard', rotulo: 'Dashboard' },
    { rota: '/chamados', rotulo: 'Chamados' },
    { rota: '/chamados/novo', rotulo: 'Novo chamado' },
    { rota: '/fila', rotulo: 'Fila do projeto' },
  ];

  constructor() {
    inject(Router)
      .events.pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuAberto.set(false));
  }

  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }
}
