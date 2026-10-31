import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { USUARIO_DEV, respostaLogin } from '../testes/dados';
import { Shell } from './shell';

describe('Shell', () => {
  afterEach(() => sessionStorage.clear());

  it('a grade tem só a barra lateral e a área principal; o pop-up de novidades fica dentro da principal', async () => {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin({ ...USUARIO_DEV, novidadesVistasVersao: 999 })));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    // Um filho a mais no host empurra a área principal para a coluna de 240px da lateral.
    const filhosNaGrade = Array.from(host.children).filter((filho) => !filho.matches('a.pular'));
    expect(filhosNaGrade.map((filho) => filho.className)).toEqual(['lateral', 'principal']);
    expect(host.querySelector('.principal app-novidades-dialogo')).not.toBeNull();
  });
});
