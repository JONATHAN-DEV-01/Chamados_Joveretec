import { contraste, corHexValida, textoSobre } from './cores';

describe('cores', () => {
  it('valida o formato #RRGGBB', () => {
    expect(corHexValida('#DA0037')).toBe(true);
    expect(corHexValida('#da0037')).toBe(true);
    expect(corHexValida('DA0037')).toBe(false);
    expect(corHexValida('#FFF')).toBe(false);
    expect(corHexValida(null)).toBe(false);
  });

  it('calcula o contraste WCAG (preto x branco = 21:1)', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contraste('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('a paleta padrão tem texto legível sobre o fundo', () => {
    expect(contraste('#EDEDED', '#171717')).toBeGreaterThan(4.5);
  });

  it('escolhe texto branco sobre o destaque padrão e preto sobre cores claras', () => {
    expect(textoSobre('#DA0037')).toBe('#FFFFFF');
    expect(textoSobre('#F5D90A')).toBe('#000000');
  });
});
