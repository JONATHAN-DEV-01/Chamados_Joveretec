import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { USUARIO_ADMIN, USUARIO_DEV, respostaLogin } from '../testes/dados';
import { carregarComParametros } from './carregamento';

describe('carregarComParametros com cache', () => {
  afterEach(() => sessionStorage.clear());

  function entrarComo(usuario = USUARIO_DEV): Injector {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin(usuario)));
    TestBed.resetTestingModule();
    TestBed.inject(AuthService);
    return TestBed.inject(Injector);
  }

  /** Simula abrir a tela: cria o carregamento e devolve a resposta "do servidor" para controlar. */
  function abrirTela(injetor: Injector, cache?: string) {
    const resposta = new Subject<string>();
    const carregamento = runInInjectionContext(injetor, () =>
      carregarComParametros(signal(1), () => resposta, cache ? { cache } : {}),
    );
    TestBed.tick();
    return { carregamento, resposta };
  }

  it('ao voltar à tela, mostra o último resultado na hora e atualiza em segundo plano', () => {
    const injetor = entrarComo();
    const primeira = abrirTela(injetor, 'tela-a');
    expect(primeira.carregamento.dados()).toBeUndefined();
    primeira.resposta.next('v1');

    const segunda = abrirTela(injetor, 'tela-a');
    expect(segunda.carregamento.dados()).toBe('v1');
    expect(segunda.carregamento.carregando()).toBe(true);
    segunda.resposta.next('v2');
    expect(segunda.carregamento.dados()).toBe('v2');
    expect(segunda.carregamento.carregando()).toBe(false);
  });

  it('não mostra o resultado de outro usuário nem guarda quando a tela não pede cache', () => {
    const primeira = abrirTela(entrarComo(USUARIO_DEV), 'tela-b');
    primeira.resposta.next('do dev');

    expect(abrirTela(entrarComo(USUARIO_ADMIN), 'tela-b').carregamento.dados()).toBeUndefined();

    const semCache = abrirTela(entrarComo(USUARIO_DEV));
    semCache.resposta.next('x');
    expect(abrirTela(entrarComo(USUARIO_DEV)).carregamento.dados()).toBeUndefined();
  });
});
