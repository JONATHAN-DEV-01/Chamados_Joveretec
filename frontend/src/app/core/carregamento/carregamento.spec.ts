import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { carregamentoInterceptor } from './carregamento.interceptor';
import { CarregamentoService, SEM_INDICADOR } from './carregamento.service';
import { ATRASO_AVISO_LENTO_MS, ATRASO_BARRA_MS, ATRASO_TELA_MS, IndicadorCarregamento } from './indicador-carregamento';

describe('CarregamentoService', () => {
  it('fica ativo enquanto houver operações e ignora encerramentos repetidos', () => {
    const servico = TestBed.inject(CarregamentoService);
    const a = servico.iniciar();
    const b = servico.iniciar();
    expect(servico.ativo()).toBe(true);
    a();
    a();
    expect(servico.ativo()).toBe(true);
    b();
    expect(servico.ativo()).toBe(false);
  });
});

describe('carregamentoInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  let servico: CarregamentoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([carregamentoInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
    servico = TestBed.inject(CarregamentoService);
  });

  it('conta a requisição até ela terminar, com sucesso ou erro', () => {
    http.get('/a').subscribe();
    http.get('/b').subscribe({ error: () => undefined });
    expect(servico.ativo()).toBe(true);

    controle.expectOne('/a').flush({});
    expect(servico.ativo()).toBe(true);
    controle.expectOne('/b').flush(null, { status: 500, statusText: 'Erro' });
    expect(servico.ativo()).toBe(false);
  });

  it('não conta requisições marcadas com SEM_INDICADOR', () => {
    http.get('/previa', { context: new HttpContext().set(SEM_INDICADOR, true) }).subscribe();
    expect(servico.ativo()).toBe(false);
    controle.expectOne('/previa').flush({});
  });

  it('cancelar a inscrição também encerra', () => {
    const assinatura = http.get('/lenta').subscribe();
    expect(servico.ativo()).toBe(true);
    assinatura.unsubscribe();
    expect(servico.ativo()).toBe(false);
  });
});

describe('IndicadorCarregamento', () => {
  // Só os timers do indicador são simulados (o agendador do Angular usa microtarefas).
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  function montar() {
    const fixture = TestBed.createComponent(IndicadorCarregamento);
    const servico = TestBed.inject(CarregamentoService);
    fixture.detectChanges();
    return { fixture, servico, elemento: fixture.nativeElement as HTMLElement };
  }

  function avancar(fixture: { detectChanges(): void }, ms: number) {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  it('não aparece em respostas rápidas', () => {
    const { fixture, servico, elemento } = montar();
    const encerrar = servico.iniciar();
    fixture.detectChanges();
    avancar(fixture, ATRASO_BARRA_MS - 50);
    encerrar();
    fixture.detectChanges();
    avancar(fixture, ATRASO_TELA_MS);
    expect(elemento.querySelector('.barra')).toBeNull();
    expect(elemento.querySelector('.tela')).toBeNull();
  });

  it('mostra a barra, depois a tela e, se demorar muito, o aviso de servidor acordando', () => {
    const { fixture, servico, elemento } = montar();
    const encerrar = servico.iniciar();
    fixture.detectChanges();

    avancar(fixture, ATRASO_BARRA_MS);
    expect(elemento.querySelector('.barra')).not.toBeNull();
    expect(elemento.querySelector('.tela')).toBeNull();

    avancar(fixture, ATRASO_TELA_MS - ATRASO_BARRA_MS);
    expect(elemento.querySelector('.tela')?.textContent).toContain('Carregando');
    expect(elemento.textContent).not.toContain('acordando');

    avancar(fixture, ATRASO_AVISO_LENTO_MS - ATRASO_TELA_MS);
    expect(elemento.textContent).toContain('O servidor pode estar acordando');

    encerrar();
    fixture.detectChanges();
    expect(elemento.querySelector('.barra')).toBeNull();
    expect(elemento.querySelector('.tela')).toBeNull();
  });
});
