import { environment } from '../../../environments/environment';
import { parametros, urlApi } from './parametros';

describe('parametros', () => {
  it('monta a URL da API a partir do ambiente', () => {
    expect(urlApi('/chamados')).toBe(`${environment.apiUrl}/api/chamados`);
  });

  it('ignora valores vazios e repete listas', () => {
    const params = parametros({
      projetoId: 3,
      busca: '',
      responsavelId: null,
      semResponsavel: false,
      status: ['ABERTO', 'CONCLUIDO'],
      urgencia: [],
      pagina: 0,
    });

    expect(params.get('projetoId')).toBe('3');
    expect(params.getAll('status')).toEqual(['ABERTO', 'CONCLUIDO']);
    expect(params.get('pagina')).toBe('0');
    expect(params.has('busca')).toBe(false);
    expect(params.has('responsavelId')).toBe(false);
    expect(params.has('semResponsavel')).toBe(false);
    expect(params.has('urgencia')).toBe(false);
  });

  it('envia booleanos verdadeiros', () => {
    expect(parametros({ semResponsavel: true }).get('semResponsavel')).toBe('true');
  });
});
