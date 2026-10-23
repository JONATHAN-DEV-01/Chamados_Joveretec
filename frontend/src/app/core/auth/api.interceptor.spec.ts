import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { respostaLogin } from '../../testes/dados';
import { ApiErro } from '../api/api-erro';
import { urlApi } from '../api/parametros';
import { apiInterceptor } from './api.interceptor';
import { AuthService } from './auth.service';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  let router: Router;

  function configurar(logado: boolean): void {
    sessionStorage.clear();
    if (logado) {
      sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin()));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  afterEach(() => controle.verify());

  it('anexa o JWT nas chamadas à API', () => {
    configurar(true);
    http.get(urlApi('/chamados')).subscribe();
    expect(controle.expectOne(urlApi('/chamados')).request.headers.get('Authorization')).toBe('Bearer token-7');
  });

  it('não envia o token para outros domínios', () => {
    configurar(true);
    http.get('https://exemplo.com/recurso').subscribe();
    expect(controle.expectOne('https://exemplo.com/recurso').request.headers.has('Authorization')).toBe(false);
  });

  it('converte o erro da API em ApiErro', () => {
    configurar(true);
    let recebido: unknown;
    http.get(urlApi('/chamados/1')).subscribe({ error: (e) => (recebido = e) });
    controle
      .expectOne(urlApi('/chamados/1'))
      .flush({ codigo: 'NAO_ENCONTRADO', mensagem: 'Chamado não encontrado.', detalhes: [] }, { status: 404, statusText: 'Not Found' });

    expect(recebido).toBeInstanceOf(ApiErro);
    expect((recebido as ApiErro).message).toBe('Chamado não encontrado.');
  });

  it('em 401 com sessão, encerra a sessão e leva ao login', () => {
    configurar(true);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get(urlApi('/chamados')).subscribe({ error: () => undefined });
    controle
      .expectOne(urlApi('/chamados'))
      .flush({ codigo: 'NAO_AUTENTICADO', mensagem: 'Token inválido.', detalhes: [] }, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { sessao: 'expirada', retorno: '/' } });
  });

  it('em 401 sem sessão (login errado) não redireciona', () => {
    configurar(false);
    const navegar = vi.spyOn(router, 'navigate');
    http.post(urlApi('/auth/login'), {}).subscribe({ error: () => undefined });
    controle
      .expectOne(urlApi('/auth/login'))
      .flush({ codigo: 'NAO_AUTENTICADO', mensagem: 'E-mail ou senha inválidos.', detalhes: [] }, { status: 401, statusText: 'Unauthorized' });

    expect(navegar).not.toHaveBeenCalled();
  });
});
