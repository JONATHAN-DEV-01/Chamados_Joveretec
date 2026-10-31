import { buscaDoMarcador, idsReferenciados, marcadorDeEnvio, naoReferenciados, referenciaDoAnexo } from './anexos-no-texto';

describe('anexos no texto', () => {
  it('imagem usa a sintaxe de imagem; outros arquivos, a de link', () => {
    expect(referenciaDoAnexo({ id: 5, nome: 'tela.png', tipoMime: 'image/png' })).toBe('![tela.png](anexo:5)');
    expect(referenciaDoAnexo({ id: 6, nome: 'log [v2].txt', tipoMime: 'text/plain' })).toBe('[log v2.txt](anexo:6)');
  });

  it('acha os ids citados, sem repetir', () => {
    expect(idsReferenciados('a ![x](anexo:3) b [y](anexo:4) c ![x](anexo:3) [z](https://e.com)')).toEqual([3, 4]);
    expect(idsReferenciados(null)).toEqual([]);
  });

  it('separa os anexos que não aparecem no texto', () => {
    expect(naoReferenciados('![x](anexo:1)', [{ id: 1 }, { id: 2 }])).toEqual([{ id: 2 }]);
  });

  it('o marcador de envio é encontrado pela chave, qualquer que seja o nome', () => {
    const texto = `antes ${marcadorDeEnvio(7, 'a.png')} depois ${marcadorDeEnvio(8, 'b.png')}`;
    expect(texto.replace(buscaDoMarcador(8), 'OK')).toBe(`antes ${marcadorDeEnvio(7, 'a.png')} depois OK`);
  });
});
