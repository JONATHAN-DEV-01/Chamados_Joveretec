import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnexoService } from '../../core/api/anexo.service';
import { Anexo } from '../../core/models/feed';
import { anexo } from '../../testes/transporte-falso';
import { ConteudoComAnexos } from './conteudo-com-anexos';

describe('ConteudoComAnexos', () => {
  const print: Anexo = { ...anexo(12, 'tela.png', 'CONCLUIDO'), tipoMime: 'image/png' };
  const log: Anexo = { ...anexo(13, 'erro.log', 'CONCLUIDO'), tamanhoBytes: 2048 };

  async function montar(texto: string, anexos: Anexo[] = [print, log]) {
    const servico = {
      links: vi.fn(() => of(new Map([[12, 'https://storage/tela.png?token=1']]))),
      linkDeDownload: vi.fn(() => of('https://storage/novo?token=2')),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AnexoService, useValue: servico }] });
    const fixture = TestBed.createComponent(ConteudoComAnexos);
    fixture.componentRef.setInput('texto', texto);
    fixture.componentRef.setInput('anexos', anexos);
    await fixture.whenStable();
    return { fixture, servico, elemento: fixture.nativeElement as HTMLElement };
  }

  it('mostra a imagem citada como miniatura, com um único pedido de links', async () => {
    const { servico, elemento } = await montar('Erro:\n\n![tela.png](anexo:12)');
    const imagem = elemento.querySelector('a.ref-imagem img') as HTMLImageElement;
    expect(imagem.alt).toBe('tela.png');
    expect(imagem.src).toBe('https://storage/tela.png?token=1');
    expect(servico.links).toHaveBeenCalledTimes(1);
    expect(servico.links).toHaveBeenCalledWith([12]);
  });

  it('mostra outros arquivos como link com nome e tamanho', async () => {
    const { servico, elemento } = await montar('Log: [erro.log](anexo:13)');
    const link = elemento.querySelector('a.ref-arquivo') as HTMLAnchorElement;
    expect(link.textContent).toContain('erro.log');
    expect(link.textContent).toContain('2 KB');
    expect(servico.links).not.toHaveBeenCalled();
  });

  it('clicar na miniatura amplia com um link novo e Esc fecha', async () => {
    const { fixture, servico, elemento } = await montar('![tela.png](anexo:12)');
    (elemento.querySelector('a.ref-imagem img') as HTMLElement).click();
    await fixture.whenStable();
    expect(servico.linkDeDownload).toHaveBeenCalledWith(12, true);
    const ampliada = elemento.querySelector('[role="dialog"] img') as HTMLImageElement;
    expect(ampliada.src).toBe('https://storage/novo?token=2');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(elemento.querySelector('[role="dialog"]')).toBeNull();
  });

  it('referência a anexo que não existe mais vira texto', async () => {
    const { elemento } = await montar('Veja [apagado.pdf](anexo:99)', []);
    expect(elemento.querySelector('a.ref-anexo')).toBeNull();
    expect(elemento.textContent).toContain('apagado.pdf (anexo indisponível)');
  });

  it('continua escapando HTML escrito pelo usuário', async () => {
    const { elemento } = await montar('<img src=x onerror=alert(1)> **ok**');
    expect(elemento.querySelector('img')).toBeNull();
    expect(elemento.querySelector('strong')?.textContent).toBe('ok');
  });
});
