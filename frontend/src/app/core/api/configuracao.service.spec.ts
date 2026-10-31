import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CONFIGURACAO_PADRAO, Configuracao } from '../models/configuracao';
import { ConfiguracaoService } from './configuracao.service';
import { urlApi } from './parametros';

describe('ConfiguracaoService', () => {
  let servico: ConfiguracaoService;
  let http: HttpTestingController;
  const personalizada: Configuracao = {
    paleta: { fundo: '#000000', superficie: '#222222', destaque: '#00AAFF', texto: '#FFFFFF' },
    geral: { nomeSistema: 'Meu Sistema', tamanhoPaginaPadrao: 50 },
    anexos: { tamanhoMaximoBytes: 1024, extensoesBloqueadas: ['exe'] },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(ConfiguracaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega e aplica a paleta do servidor', () => {
    servico.carregar().subscribe();
    http.expectOne(urlApi('/configuracoes')).flush(personalizada);

    expect(servico.atual().geral.nomeSistema).toBe('Meu Sistema');
    expect(document.documentElement.style.getPropertyValue('--cor-destaque')).toBe('#00AAFF');
  });

  it('mantém a paleta padrão se o servidor falhar (o app abre mesmo assim)', () => {
    let resultado: Configuracao | undefined;
    servico.carregar().subscribe((c) => (resultado = c));
    http.expectOne(urlApi('/configuracoes')).flush(null, { status: 503, statusText: 'Unavailable' });

    expect(resultado).toEqual(CONFIGURACAO_PADRAO);
    expect(servico.atual()).toEqual(CONFIGURACAO_PADRAO);
  });

  it('salva e passa a usar a configuração nova', () => {
    servico.salvar(personalizada).subscribe();
    const requisicao = http.expectOne(urlApi('/configuracoes'));
    expect(requisicao.request.method).toBe('PUT');
    requisicao.flush(personalizada);
    expect(servico.atual()).toEqual(personalizada);
  });
});
