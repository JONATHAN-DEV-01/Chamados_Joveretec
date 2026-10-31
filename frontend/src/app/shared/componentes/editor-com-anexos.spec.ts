import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { AnexoService } from '../../core/api/anexo.service';
import { ConfiguracaoService } from '../../core/api/configuracao.service';
import { FilaDeEnvios } from '../../core/envio/fila-de-envios';
import { CONFIGURACAO_PADRAO } from '../../core/models/configuracao';
import { NotificacaoService } from '../../core/notificacao/notificacao.service';
import { anexo, anexoServiceFalso, arquivo, fabricaFalsa } from '../../testes/transporte-falso';
import { EditorComAnexos } from './editor-com-anexos';

describe('EditorComAnexos', () => {
  async function montar(textoInicial = '') {
    const { fabrica, criados } = fabricaFalsa();
    const servico = anexoServiceFalso();
    const fila = new FilaDeEnvios(
      servico as unknown as AnexoService,
      () => of({ chamadoId: null, acompanhamentoId: null }),
      fabrica,
    );
    const configuracao = { ...CONFIGURACAO_PADRAO, anexos: { tamanhoMaximoBytes: 1000, extensoesBloqueadas: ['exe'] } };
    TestBed.configureTestingModule({
      providers: [{ provide: ConfiguracaoService, useValue: { atual: signal(configuracao) } }],
    });
    const controle = new FormControl(textoInicial, { nonNullable: true });
    const fixture = TestBed.createComponent(EditorComAnexos);
    fixture.componentRef.setInput('controle', controle);
    fixture.componentRef.setInput('fila', fila);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    return { fixture, fila, criados, servico, controle, elemento };
  }

  function escolher(elemento: HTMLElement, arquivos: File[]): void {
    const entrada = elemento.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(entrada, 'files', { value: arquivos, configurable: true });
    entrada.dispatchEvent(new Event('change'));
  }

  it('o clipe envia o arquivo e marca o ponto no texto até o envio terminar', async () => {
    const { fixture, criados, controle, elemento } = await montar('Veja o log:');
    escolher(elemento, [arquivo('erro.log', 'abc')]);
    await fixture.whenStable();
    expect(controle.value).toBe('Veja o log:\n[⏳ Enviando erro.log…](enviando:1)\n');
    expect(controle.dirty).toBe(true);

    criados[0].eventos.sucesso();
    await fixture.whenStable();
    expect(controle.value).toBe('Veja o log:\n[log.txt](anexo:100)\n');
  });

  it('imagem colada vira miniatura (![nome]) e ganha um nome com data e hora', async () => {
    const { fixture, criados, servico, controle, elemento } = await montar();
    servico.confirmar.mockImplementation((id: number) =>
      of({ ...anexo(id, 'print.png', 'CONCLUIDO'), tipoMime: 'image/png' }),
    );
    const print = new File(['png'], 'image.png', { type: 'image/png' });
    const colar = new Event('paste', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(colar, 'clipboardData', { value: { files: [print] } });
    elemento.querySelector('textarea')!.dispatchEvent(colar);
    await fixture.whenStable();

    expect(colar.defaultPrevented).toBe(true);
    expect(servico.solicitarEnvio.mock.calls[0][1].nome).toMatch(/^print-\d{8}-\d{6}\.png$/);
    criados[0].eventos.sucesso();
    await fixture.whenStable();
    expect(controle.value).toBe('![print.png](anexo:100)\n');
  });

  it('colar texto comum não é interceptado', async () => {
    const { elemento, fila } = await montar();
    const colar = new Event('paste', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(colar, 'clipboardData', { value: { files: [] } });
    elemento.querySelector('textarea')!.dispatchEvent(colar);
    expect(colar.defaultPrevented).toBe(false);
    expect(fila.vazia()).toBe(true);
  });

  it('aceita arquivos arrastados e soltos sobre o campo', async () => {
    const { fixture, fila, elemento } = await montar();
    const soltar = new Event('drop', { cancelable: true }) as DragEvent;
    Object.defineProperty(soltar, 'dataTransfer', { value: { files: [arquivo('a.txt'), arquivo('b.txt')] } });
    elemento.querySelector('.editor')!.dispatchEvent(soltar);
    await fixture.whenStable();
    expect(fila.envios()).toHaveLength(2);
  });

  it('recusa extensão bloqueada e arquivo acima do limite, sem enviar', async () => {
    const { fila, controle, elemento } = await montar();
    const erro = vi.spyOn(TestBed.inject(NotificacaoService), 'erro');
    escolher(elemento, [arquivo('setup.EXE'), arquivo('grande.zip', 'x'.repeat(2000))]);

    expect(fila.vazia()).toBe(true);
    expect(controle.value).toBe('');
    expect(erro).toHaveBeenCalledWith(expect.stringContaining('.exe não são permitidos'));
    expect(erro).toHaveBeenCalledWith(expect.stringContaining('o limite é 1.000 B'));
  });

  it('remover um envio tira o marcador do texto', async () => {
    const { fixture, fila, criados, controle, elemento } = await montar('Antes');
    escolher(elemento, [arquivo('erro.log')]);
    criados[0].eventos.falha('Falhou no meio.');
    await fixture.whenStable();
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('Falhou no meio.');

    (elemento.querySelector('[aria-label="Remover erro.log"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fila.vazia()).toBe(true);
    expect(controle.value).toBe('Antes\n');
  });

  it('permite pausar e retomar o envio', async () => {
    const { fixture, criados, elemento } = await montar();
    escolher(elemento, [arquivo()]);
    await fixture.whenStable();
    botao(elemento, 'Cancelar').click();
    await fixture.whenStable();
    expect(elemento.textContent).toContain('Pausado');
    botao(elemento, 'Retomar').click();
    expect(criados[0].inicios).toBe(2);
  });

  function botao(elemento: HTMLElement, texto: string): HTMLButtonElement {
    return Array.from(elemento.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }
});
