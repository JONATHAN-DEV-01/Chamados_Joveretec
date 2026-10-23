import { renderizarMarkdown } from './markdown';

describe('renderizarMarkdown', () => {
  it('renderiza Markdown simples e quebras de linha', () => {
    const html = renderizarMarkdown('**negrito** e *itálico*\nlinha 2\n\n- item\n- `codigo`');
    expect(html).toContain('<strong>negrito</strong>');
    expect(html).toContain('<em>itálico</em>');
    expect(html).toContain('<br>');
    expect(html).toContain('<li><code>codigo</code></li>');
  });

  it('escapa HTML bruto em vez de interpretá-lo', () => {
    const html = renderizarMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('só gera links http(s)/mailto, em nova aba e sem opener', () => {
    const html = renderizarMarkdown('[site](https://exemplo.com) [mau](javascript:alert(1))');
    expect(html).toContain('<a href="https://exemplo.com" target="_blank" rel="noopener noreferrer">site</a>');
    expect(html).not.toContain('javascript:');
  });

  it('não carrega imagens externas', () => {
    const html = renderizarMarkdown('![foto](https://rastreador.com/pixel.png)');
    expect(html).not.toContain('<img');
    expect(html).toContain('href="https://rastreador.com/pixel.png"');
  });

  it('texto vazio vira string vazia', () => {
    expect(renderizarMarkdown(null)).toBe('');
  });
});
