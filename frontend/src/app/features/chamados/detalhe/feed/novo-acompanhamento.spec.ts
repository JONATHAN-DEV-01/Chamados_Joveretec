import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnexoService } from '../../../../core/api/anexo.service';
import { FeedService } from '../../../../core/api/feed.service';
import { FABRICA_DE_TRANSPORTE } from '../../../../core/envio/fila-de-envios';
import { Acompanhamento } from '../../../../core/models/feed';
import { anexoServiceFalso, arquivo, fabricaFalsa, TransporteFalso } from '../../../../testes/transporte-falso';
import { NovoAcompanhamento } from './novo-acompanhamento';

describe('NovoAcompanhamento', () => {
  let fixture: ComponentFixture<NovoAcompanhamento>;
  let elemento: HTMLElement;
  let feed: { publicar: ReturnType<typeof vi.fn>; criarRascunho: ReturnType<typeof vi.fn> };
  let transportes: TransporteFalso[];
  let publicados: Acompanhamento[];

  beforeEach(async () => {
    feed = {
      publicar: vi.fn(() => of({ id: 1 } as Acompanhamento)),
      criarRascunho: vi.fn(() => of({ id: 55 })),
    };
    const falsa = fabricaFalsa();
    transportes = falsa.criados;
    TestBed.configureTestingModule({
      imports: [NovoAcompanhamento],
      providers: [
        { provide: FeedService, useValue: feed },
        { provide: AnexoService, useValue: anexoServiceFalso() },
        { provide: FABRICA_DE_TRANSPORTE, useValue: falsa.fabrica },
      ],
    });
    fixture = TestBed.createComponent(NovoAcompanhamento);
    fixture.componentRef.setInput('chamadoId', 10);
    publicados = [];
    fixture.componentInstance.publicado.subscribe((a) => publicados.push(a));
    await fixture.whenStable();
    elemento = fixture.nativeElement;
  });

  function digitar(texto: string): void {
    const campo = elemento.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
  }

  function escolherTipo(valor: 'ACOMPANHAMENTO' | 'SOLUCAO'): void {
    (elemento.querySelector(`input[type="radio"][value="${valor}"]`) as HTMLInputElement).click();
  }

  function publicarBotao(): HTMLButtonElement {
    return elemento.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  it('publica com texto, tipo padrão e tempo gasto', async () => {
    digitar('Investiguei o problema');
    const tempo = elemento.querySelector('input[type="number"]') as HTMLInputElement;
    tempo.value = '30';
    tempo.dispatchEvent(new Event('input'));
    publicarBotao().click();
    await fixture.whenStable();

    expect(feed.publicar).toHaveBeenCalledWith(10, {
      texto: 'Investiguei o problema',
      tipo: 'ACOMPANHAMENTO',
      tempoGastoMinutos: 30,
      concluirChamado: false,
      rascunhoId: null,
    });
    expect(publicados).toHaveLength(1);
    expect((elemento.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });

  it('não publica sem texto', async () => {
    publicarBotao().click();
    await fixture.whenStable();
    expect(feed.publicar).not.toHaveBeenCalled();
    expect(elemento.textContent).toContain('Campo obrigatório.');
  });

  it('Ctrl+Enter publica', async () => {
    digitar('Atalho');
    elemento.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await fixture.whenStable();
    expect(feed.publicar).toHaveBeenCalledTimes(1);
  });

  it('Solução oferece concluir o chamado (marcado por padrão)', async () => {
    expect(elemento.textContent).not.toContain('Concluir o chamado');
    escolherTipo('SOLUCAO');
    await fixture.whenStable();
    expect(elemento.textContent).toContain('Concluir o chamado');

    digitar('Resolvido');
    publicarBotao().click();
    await fixture.whenStable();
    expect(feed.publicar).toHaveBeenCalledWith(10, expect.objectContaining({ tipo: 'SOLUCAO', concluirChamado: true }));
  });

  it('não oferece concluir se o chamado já está concluído', async () => {
    fixture.componentRef.setInput('chamadoConcluido', true);
    escolherTipo('SOLUCAO');
    await fixture.whenStable();
    expect(elemento.textContent).not.toContain('Concluir o chamado');
  });

  it('com anexos: cria rascunho, espera os envios e publica com o rascunhoId', async () => {
    const input = elemento.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [arquivo('print.png')], configurable: true });
    input.dispatchEvent(new Event('change'));
    digitar('Com anexo');
    await fixture.whenStable();

    expect(feed.criarRascunho).toHaveBeenCalledWith(10);
    expect(publicarBotao().disabled).toBe(true);
    expect(elemento.textContent).toContain('Aguardando o envio dos arquivos');

    transportes[0].eventos.sucesso();
    await fixture.whenStable();
    expect(publicarBotao().disabled).toBe(false);

    publicarBotao().click();
    await fixture.whenStable();
    expect(feed.publicar).toHaveBeenCalledWith(10, expect.objectContaining({ rascunhoId: 55 }));
    expect(elemento.textContent).not.toContain('print.png');
  });
});
