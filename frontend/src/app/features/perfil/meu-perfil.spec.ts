import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { urlApi } from '../../core/api/parametros';
import { AuthService } from '../../core/auth/auth.service';
import { CONFIGURACAO_PADRAO, Paleta } from '../../core/models/configuracao';
import { USUARIO_DEV, respostaLogin } from '../../testes/dados';
import { MeuPerfil } from './meu-perfil';

describe('MeuPerfil', () => {
  const PESSOAL: Paleta = { fundo: '#101010', superficie: '#333333', destaque: '#FFCC00', texto: '#FAFAFA' };
  const GLOBAL = CONFIGURACAO_PADRAO.paleta;

  async function montar(paleta: Paleta | null) {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin({ ...USUARIO_DEV, paleta })));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(MeuPerfil);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      elemento,
      http: TestBed.inject(HttpTestingController),
      auth: TestBed.inject(AuthService),
      campo: (chave: keyof Paleta) => elemento.querySelector<HTMLInputElement>(`#cor-${chave}`)!,
      botao: (texto: string) =>
        Array.from(elemento.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!,
    };
  }

  function digitar(campo: HTMLInputElement, valor: string): void {
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  afterEach(() => sessionStorage.clear());

  it('sem paleta pessoal, parte da paleta do sistema e só deixa salvar depois de mudar algo', async () => {
    const { elemento, campo, botao } = await montar(null);

    expect(campo('destaque').value).toBe(GLOBAL.destaque);
    expect(elemento.textContent).toContain('Você está usando a paleta padrão do sistema');
    expect(botao('Salvar').disabled).toBe(true);
  });

  it('salva a paleta escolhida e a aplica na sessão', async () => {
    const { fixture, campo, botao, http, auth } = await montar(null);
    digitar(campo('destaque'), '#1E88E5');
    await fixture.whenStable();

    botao('Salvar').click();
    const pedido = http.expectOne(urlApi('/auth/me/paleta'));
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ ...GLOBAL, destaque: '#1E88E5' });
    pedido.flush({ ...GLOBAL, destaque: '#1E88E5' });

    expect(auth.usuario()!.paleta!.destaque).toBe('#1E88E5');
    TestBed.tick();
    expect(document.documentElement.style.getPropertyValue('--cor-destaque')).toBe('#1E88E5');
  });

  it('"Restaurar padrão" mostra a paleta do sistema e, ao salvar, remove a pessoal', async () => {
    const { fixture, elemento, campo, botao, http, auth } = await montar(PESSOAL);
    expect(campo('fundo').value).toBe('#101010');
    expect(elemento.textContent).toContain('Você está usando uma paleta pessoal');

    botao('Restaurar padrão').click();
    await fixture.whenStable();
    expect(campo('fundo').value).toBe(GLOBAL.fundo);
    expect(elemento.textContent).toContain('Ao salvar, você volta a usar a paleta padrão do sistema');

    botao('Salvar').click();
    const pedido = http.expectOne(urlApi('/auth/me/paleta'));
    expect(pedido.request.method).toBe('DELETE');
    pedido.flush(null);

    expect(auth.usuario()!.paleta).toBeNull();
  });

  it('avisa quando o texto fica ilegível sobre o fundo', async () => {
    const { fixture, elemento, campo } = await montar(null);
    digitar(campo('texto'), '#202020');
    await fixture.whenStable();

    expect(elemento.textContent).toContain('O texto tem pouco contraste com o fundo');
  });
});
