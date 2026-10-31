import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ConfiguracaoService } from '../core/api/configuracao.service';
import { AuthService } from '../core/auth/auth.service';
import { NovidadesService } from '../core/novidades/novidades.service';
import { RotuloPerfilPipe } from '../shared/rotulos';
import { NovidadesDialogo } from './novidades-dialogo';

interface ItemMenu {
  rota: string;
  rotulo: string;
}

/** Estrutura das telas autenticadas: barra lateral, cabeçalho e conteúdo. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RotuloPerfilPipe, NovidadesDialogo],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly configuracao = inject(ConfiguracaoService).atual;
  protected readonly menuAberto = signal(false);
  protected readonly novidades = inject(NovidadesService);

  protected readonly menuPrincipal: ItemMenu[] = [
    { rota: '/dashboard', rotulo: 'Dashboard' },
    { rota: '/chamados', rotulo: 'Chamados' },
    { rota: '/chamados/novo', rotulo: 'Novo chamado' },
    { rota: '/fila', rotulo: 'Fila do projeto' },
    { rota: '/perfil', rotulo: 'Meu perfil' },
  ];

  /** Visível só para ADMIN (as rotas também têm guard e o backend valida o perfil). */
  protected readonly menuAdmin: ItemMenu[] = [
    { rota: '/admin/projetos', rotulo: 'Projetos' },
    { rota: '/admin/usuarios', rotulo: 'Usuários' },
    { rota: '/admin/configuracoes', rotulo: 'Configurações' },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuAberto.set(false));
    // Primeiro acesso depois de uma versão nova: as novidades abrem sozinhas (uma vez).
    effect(() => {
      if (this.novidades.pendentes()) {
        untracked(() => this.novidades.abrir());
      }
    });
  }

  protected abrirNovidades(): void {
    this.menuAberto.set(false);
    this.novidades.abrir();
  }

  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  protected sair(): void {
    this.auth.encerrar();
    void this.router.navigate(['/login']);
  }
}
