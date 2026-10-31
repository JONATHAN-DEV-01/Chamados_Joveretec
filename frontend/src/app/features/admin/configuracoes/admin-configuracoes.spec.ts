import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { urlApi } from '../../../core/api/parametros';
import { CONFIGURACAO_PADRAO, Configuracao } from '../../../core/models/configuracao';
import { AdminConfiguracoes } from './admin-configuracoes';

describe('AdminConfiguracoes', () => {
  const personalizada: Configuracao = {
    paleta: { fundo: '#000000', superficie: '#222222', destaque: '#00AAFF', texto: '#FFFFFF' },
    geral: { nomeSistema: 'Meu Sistema', tamanhoPaginaPadrao: 50 },
    anexos: CONFIGURACAO_PADRAO.anexos,
  };

  it('"Restaurar padrão" volta a paleta e as configurações gerais ao padrão', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AdminConfiguracoes);
    TestBed.inject(HttpTestingController).expectOne(urlApi('/configuracoes')).flush(personalizada);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    const campo = (id: string) => elemento.querySelector<HTMLInputElement>(`#${id}`)!.value;
    expect(campo('cor-destaque')).toBe('#00AAFF');

    Array.from(elemento.querySelectorAll('button')).find((b) => /Restaurar/.test(b.textContent ?? ''))!.click();
    await fixture.whenStable();

    expect(campo('cor-destaque')).toBe(CONFIGURACAO_PADRAO.paleta.destaque);
    expect(campo('cor-fundo')).toBe(CONFIGURACAO_PADRAO.paleta.fundo);
    // Sem erro no meio do caminho, o formulário fica alterado e o padrão pode ser salvo.
    expect(elemento.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });
});
