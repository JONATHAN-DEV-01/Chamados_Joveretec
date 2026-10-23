import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { USUARIO_ADMIN, USUARIO_DEV, respostaLogin } from '../../testes/dados';
import { urlApi } from '../api/parametros';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;

  function criar(): AuthService {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => http.verify());

  it('faz login, guarda a sessão e expõe o usuário', () => {
    const auth = criar();
    let usuario;
    auth.login('  ana@teste.local ', 'segredo').subscribe((u) => (usuario = u));

    const requisicao = http.expectOne(urlApi('/auth/login'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ email: 'ana@teste.local', senha: 'segredo' });
    requisicao.flush(respostaLogin());

    expect(usuario).toEqual(USUARIO_DEV);
    expect(auth.autenticado()).toBe(true);
    expect(auth.token()).toBe('token-7');
    expect(auth.isAdmin()).toBe(false);
    expect(sessionStorage.getItem('chamados.sessao')).toContain('token-7');
  });

  it('restaura a sessão salva ao iniciar', () => {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin(USUARIO_ADMIN)));
    const auth = criar();
    expect(auth.usuario()?.nome).toBe('Admin');
    expect(auth.isAdmin()).toBe(true);
  });

  it('descarta sessão expirada', () => {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin(USUARIO_DEV, -1)));
    const auth = criar();
    expect(auth.token()).toBeNull();
    expect(auth.autenticado()).toBe(false);
    expect(auth.usuario()).toBeNull();
    expect(sessionStorage.getItem('chamados.sessao')).toBeNull();
  });

  it('encerrar limpa a sessão', () => {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin()));
    const auth = criar();
    auth.encerrar();
    expect(auth.autenticado()).toBe(false);
    expect(sessionStorage.getItem('chamados.sessao')).toBeNull();
  });

  it('atualiza o perfil do usuário logado sem perder o token', () => {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin()));
    const auth = criar();
    auth.atualizarUsuario({ ...USUARIO_DEV, perfil: 'ADMIN' });
    expect(auth.isAdmin()).toBe(true);
    expect(auth.token()).toBe('token-7');

    auth.atualizarUsuario({ ...USUARIO_ADMIN, nome: 'Outro' });
    expect(auth.usuario()?.nome).toBe('Ana Dev');
  });
});
