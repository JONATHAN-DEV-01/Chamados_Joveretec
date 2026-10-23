import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { USUARIO_ADMIN, respostaLogin } from '../../testes/dados';
import { adminGuard, autenticadoGuard, visitanteGuard } from './guards';

describe('guards', () => {
  const rota = {} as ActivatedRouteSnapshot;
  const estado = { url: '/chamados?status=ABERTO' } as RouterStateSnapshot;

  function configurar(sessao: object | null): void {
    sessionStorage.clear();
    if (sessao) {
      sessionStorage.setItem('chamados.sessao', JSON.stringify(sessao));
    }
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  }

  function executar(guard: typeof autenticadoGuard) {
    return TestBed.runInInjectionContext(() => guard(rota, estado));
  }

  function url(resultado: unknown): string {
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }

  it('autenticadoGuard libera quem está logado', () => {
    configurar(respostaLogin());
    expect(executar(autenticadoGuard)).toBe(true);
  });

  it('autenticadoGuard manda ao login guardando a rota pedida', () => {
    configurar(null);
    expect(url(executar(autenticadoGuard))).toBe('/login?retorno=%2Fchamados%3Fstatus%3DABERTO');
  });

  it('adminGuard libera ADMIN e barra desenvolvedor', () => {
    configurar(respostaLogin(USUARIO_ADMIN));
    expect(executar(adminGuard)).toBe(true);

    TestBed.resetTestingModule();
    configurar(respostaLogin());
    expect(url(executar(adminGuard))).toBe('/dashboard');
  });

  it('visitanteGuard tira do login quem já está logado', () => {
    configurar(respostaLogin());
    expect(url(executar(visitanteGuard))).toBe('/dashboard');

    TestBed.resetTestingModule();
    configurar(null);
    expect(executar(visitanteGuard)).toBe(true);
  });
});
