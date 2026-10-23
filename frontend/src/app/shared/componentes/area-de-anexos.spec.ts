import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnexoService } from '../../core/api/anexo.service';
import { FilaDeEnvios } from '../../core/envio/fila-de-envios';
import { anexoServiceFalso, arquivo, fabricaFalsa } from '../../testes/transporte-falso';
import { AreaDeAnexos } from './area-de-anexos';

describe('AreaDeAnexos', () => {
  async function montar() {
    const { fabrica, criados } = fabricaFalsa();
    const fila = new FilaDeEnvios(
      anexoServiceFalso() as unknown as AnexoService,
      () => of({ chamadoId: 1, acompanhamentoId: 2 }),
      fabrica,
    );
    const fixture = TestBed.createComponent(AreaDeAnexos);
    fixture.componentRef.setInput('fila', fila);
    await fixture.whenStable();
    return { fixture, fila, criados, elemento: fixture.nativeElement as HTMLElement };
  }

  function selecionar(elemento: HTMLElement, arquivos: File[]): void {
    const input = elemento.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: arquivos, configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  it('adiciona os arquivos escolhidos e mostra nome, tamanho e progresso', async () => {
    const { fixture, criados, elemento } = await montar();
    selecionar(elemento, [arquivo('relatorio.txt', 'x'.repeat(2048))]);
    criados[0].eventos.progresso(512, 2048);
    await fixture.whenStable();

    expect(elemento.textContent).toContain('relatorio.txt');
    expect(elemento.textContent).toContain('2 KB');
    expect(elemento.textContent).toContain('Enviando 25%');
    expect(elemento.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('25');
  });

  it('permite cancelar e retomar o envio', async () => {
    const { fixture, criados, elemento } = await montar();
    selecionar(elemento, [arquivo()]);
    await fixture.whenStable();

    botao(elemento, 'Cancelar').click();
    await fixture.whenStable();
    expect(criados[0].pausas).toBe(1);
    expect(elemento.textContent).toContain('Pausado');

    botao(elemento, 'Retomar').click();
    await fixture.whenStable();
    expect(criados[0].inicios).toBe(2);
  });

  it('mostra a mensagem de erro e permite remover o arquivo', async () => {
    const { fixture, fila, criados, elemento } = await montar();
    selecionar(elemento, [arquivo('grande.iso')]);
    criados[0].eventos.falha('O arquivo é maior que o limite permitido pelo armazenamento.');
    await fixture.whenStable();
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('maior que o limite');

    (elemento.querySelector('[aria-label="Remover grande.iso"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fila.vazia()).toBe(true);
    expect(elemento.textContent).not.toContain('grande.iso');
  });

  it('aceita arquivos arrastados e soltos', async () => {
    const { fixture, fila, elemento } = await montar();
    const zona = elemento.querySelector('.zona') as HTMLElement;
    const evento = new Event('drop') as DragEvent;
    Object.defineProperty(evento, 'dataTransfer', { value: { files: [arquivo('a.txt'), arquivo('b.txt')] } });
    zona.dispatchEvent(evento);
    await fixture.whenStable();
    expect(fila.envios()).toHaveLength(2);
  });

  function botao(elemento: HTMLElement, texto: string): HTMLButtonElement {
    return Array.from(elemento.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }
});
