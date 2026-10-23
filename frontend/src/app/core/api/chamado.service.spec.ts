import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { chamado, pagina } from '../../testes/dados';
import { ChamadoService } from './chamado.service';
import { urlApi } from './parametros';

describe('ChamadoService', () => {
  let servico: ChamadoService;
  let http: HttpTestingController;
  const url = urlApi('/chamados');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(ChamadoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista com filtros combinados e paginação', () => {
    servico
      .listar(
        { projetoId: 2, responsavelId: 7, status: ['ABERTO', 'EM_ANDAMENTO'], urgencia: ['CRITICA'], busca: 'login' },
        { pagina: 1, tamanho: 20 },
      )
      .subscribe();

    const requisicao = http.expectOne((r) => r.url === url);
    const params = requisicao.request.params;
    expect(params.get('projetoId')).toBe('2');
    expect(params.get('responsavelId')).toBe('7');
    expect(params.getAll('status')).toEqual(['ABERTO', 'EM_ANDAMENTO']);
    expect(params.getAll('urgencia')).toEqual(['CRITICA']);
    expect(params.get('busca')).toBe('login');
    expect(params.get('pagina')).toBe('1');
    requisicao.flush(pagina([]));
  });

  it('usa os endpoints de ação do chamado', () => {
    servico.alterarStatus(10, 'CONCLUIDO').subscribe();
    servico.atribuirAMim(10).subscribe();
    servico.reordenar(10, 3).subscribe();

    const status = http.expectOne(`${url}/10/status`);
    expect(status.request.method).toBe('PATCH');
    expect(status.request.body).toEqual({ status: 'CONCLUIDO' });

    const atribuir = http.expectOne(`${url}/10/atribuir-a-mim`);
    expect(atribuir.request.method).toBe('POST');

    const posicao = http.expectOne(`${url}/10/posicao`);
    expect(posicao.request.method).toBe('PUT');
    expect(posicao.request.body).toEqual({ posicao: 3 });

    [status, atribuir, posicao].forEach((r) => r.flush(chamado()));
  });

  it('envia a versão na edição (lock otimista)', () => {
    servico
      .editar(10, { titulo: 'T', descricao: 'D', urgencia: 'ALTA', responsavelId: null, versao: 4 })
      .subscribe();
    const requisicao = http.expectOne(`${url}/10`);
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body.versao).toBe(4);
    requisicao.flush(chamado());
  });
});
