import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { urlApi } from '../core/api/parametros';
import { AuthService } from '../core/auth/auth.service';
import { NOVIDADES, VERSAO_ATUAL_DAS_NOVIDADES } from '../core/novidades/novidades';
import { NovidadesService } from '../core/novidades/novidades.service';
import { USUARIO_DEV, respostaLogin } from '../testes/dados';
import { NovidadesDialogo } from './novidades-dialogo';

describe('Novidades da plataforma', () => {
  // O jsdom não implementa o modal do <dialog>; os navegadores, sim.
  beforeAll(() => {
    const prototipo = HTMLDialogElement.prototype;
    prototipo.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    prototipo.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
  });
  afterEach(() => sessionStorage.clear());

  async function montar(novidadesVistasVersao: number) {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin({ ...USUARIO_DEV, novidadesVistasVersao })));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const fixture = TestBed.createComponent(NovidadesDialogo);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      elemento,
      dialogo: elemento.querySelector('dialog') as HTMLDialogElement,
      servico: TestBed.inject(NovidadesService),
      auth: TestBed.inject(AuthService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('a lista de versões é crescente e a atual tem título e frase em cada item', () => {
    const versoes = NOVIDADES.map((v) => v.versao);
    expect(versoes).toEqual([...versoes].sort((a, b) => a - b));
    const atual = NOVIDADES.find((v) => v.versao === VERSAO_ATUAL_DAS_NOVIDADES)!;
    expect(atual.itens.length).toBeGreaterThan(0);
    atual.itens.forEach((item) => expect(item.titulo && item.texto).toBeTruthy());
  });

  it('fica pendente só para quem ainda não viu a versão atual', async () => {
    expect((await montar(0)).servico.pendentes()).toBe(true);
    TestBed.resetTestingModule();
    expect((await montar(VERSAO_ATUAL_DAS_NOVIDADES)).servico.pendentes()).toBe(false);
  });

  it('"Entendi" fecha e registra no servidor; não reaparece nesta aba', async () => {
    const { fixture, elemento, dialogo, servico, auth, http } = await montar(0);
    servico.abrir();
    await fixture.whenStable();
    expect(dialogo.open).toBe(true);
    expect(elemento.textContent).toContain('Mais de um responsável por chamado');

    Array.from(elemento.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Entendi')!.click();
    await fixture.whenStable();

    expect(dialogo.open).toBe(false);
    const pedido = http.expectOne(urlApi('/auth/me/novidades'));
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ versao: VERSAO_ATUAL_DAS_NOVIDADES });
    pedido.flush({ versao: VERSAO_ATUAL_DAS_NOVIDADES });
    expect(auth.usuario()!.novidadesVistasVersao).toBe(VERSAO_ATUAL_DAS_NOVIDADES);
    expect(servico.pendentes()).toBe(false);
  });

  it('clicar fora ou no X também fecha e marca como visto; falha no servidor não vira erro', async () => {
    const { fixture, elemento, dialogo, servico, http } = await montar(0);
    servico.abrir();
    await fixture.whenStable();

    dialogo.dispatchEvent(new MouseEvent('click', { bubbles: true })); // clique no fundo
    await fixture.whenStable();
    expect(dialogo.open).toBe(false);
    http.expectOne(urlApi('/auth/me/novidades')).flush(null, { status: 404, statusText: 'Not Found' });
    expect(servico.pendentes()).toBe(false);

    servico.abrir(); // reabrir pelo link "Novidades"
    await fixture.whenStable();
    (elemento.querySelector('button[aria-label="Fechar novidades"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(dialogo.open).toBe(false);
    http.expectNone(urlApi('/auth/me/novidades')); // já estava visto: não pede de novo
  });
});
