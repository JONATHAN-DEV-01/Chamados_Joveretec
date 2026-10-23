import { SEM_RESPONSAVEL, alternar, lerLista, paginaDa, paraFiltro } from './filtro-url';

describe('filtro-url', () => {
  it('converte os query params em filtro da API', () => {
    expect(
      paraFiltro({ projetoId: '3', responsavel: '7', status: 'ABERTO,CONCLUIDO', urgencia: 'ALTA', busca: ' login ' }),
    ).toEqual({
      projetoId: 3,
      responsavelId: 7,
      semResponsavel: false,
      status: ['ABERTO', 'CONCLUIDO'],
      urgencia: ['ALTA'],
      busca: 'login',
    });
  });

  it('entende "sem responsável"', () => {
    const filtro = paraFiltro({ responsavel: SEM_RESPONSAVEL });
    expect(filtro.semResponsavel).toBe(true);
    expect(filtro.responsavelId).toBeNull();
  });

  it('ignora valores inválidos vindos da URL', () => {
    expect(lerLista('ABERTO,PENDENTE,', ['ABERTO', 'CONCLUIDO'])).toEqual(['ABERTO']);
    expect(paraFiltro({ projetoId: 'abc' }).projetoId).toBeNull();
    expect(paginaDa({ pagina: '-2' })).toBe(0);
    expect(paginaDa({ pagina: '3' })).toBe(3);
  });

  it('alterna valores dos chips', () => {
    expect(alternar(['ALTA'], 'BAIXA')).toBe('ALTA,BAIXA');
    expect(alternar(['ALTA', 'BAIXA'], 'ALTA')).toBe('BAIXA');
    expect(alternar(['ALTA'], 'ALTA')).toBeNull();
  });
});
