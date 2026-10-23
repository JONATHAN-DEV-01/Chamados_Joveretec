import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnexoService } from '../../../../core/api/anexo.service';
import { FeedService } from '../../../../core/api/feed.service';
import { Acompanhamento, ItemFeed } from '../../../../core/models/feed';
import { pagina } from '../../../../testes/dados';
import { anexo, anexoServiceFalso } from '../../../../testes/transporte-falso';
import { FeedChamado } from './feed-chamado';

function acompanhamento(id: number, texto: string, extras: Partial<Acompanhamento> = {}): ItemFeed {
  return {
    tipo: 'ACOMPANHAMENTO',
    data: `2026-10-23T1${id}:00:00Z`,
    acompanhamento: {
      id,
      tipo: 'ACOMPANHAMENTO',
      texto,
      tempoGastoMinutos: null,
      autor: { id: 7, nome: 'Ana Dev' },
      criadoEm: `2026-10-23T1${id}:00:00Z`,
      editadoEm: null,
      podeAlterar: false,
      anexos: [],
      ...extras,
    },
  };
}

const ABERTURA: ItemFeed = {
  tipo: 'ABERTURA',
  data: '2026-10-23T09:00:00Z',
  abertura: {
    descricao: 'O relatório não abre',
    autor: { id: 1, nome: 'Bruno Lima' },
    criadoEm: '2026-10-23T09:00:00Z',
    anexos: [anexo(3, 'erro.log', 'CONCLUIDO')],
  },
};

const EVENTO: ItemFeed = {
  tipo: 'EVENTO',
  data: '2026-10-23T10:30:00Z',
  evento: {
    id: 9,
    campo: 'STATUS',
    valorAnterior: 'ABERTO',
    valorNovo: 'EM_ANDAMENTO',
    usuario: { id: 7, nome: 'Ana Dev' },
    alteradoEm: '2026-10-23T10:30:00Z',
  },
};

describe('FeedChamado', () => {
  let fixture: ComponentFixture<FeedChamado>;
  let elemento: HTMLElement;
  let feed: { feed: ReturnType<typeof vi.fn> };

  async function montar(respostas: ReturnType<typeof pagina<ItemFeed>>[]) {
    feed = { feed: vi.fn() };
    respostas.forEach((r) => feed.feed.mockReturnValueOnce(of(r)));
    TestBed.configureTestingModule({
      imports: [FeedChamado],
      providers: [
        { provide: FeedService, useValue: feed },
        { provide: AnexoService, useValue: anexoServiceFalso() },
      ],
    });
    fixture = TestBed.createComponent(FeedChamado);
    fixture.componentRef.setInput('chamadoId', 10);
    fixture.componentRef.setInput('versao', 0);
    await fixture.whenStable();
    elemento = fixture.nativeElement;
  }

  function itens(): string[] {
    return Array.from(elemento.querySelectorAll('.linha-do-tempo > li')).map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
  }

  it('mostra abertura, eventos e acompanhamentos em ordem cronológica (API devolve DESC)', async () => {
    // Mais recente primeiro, como a API responde com ordem=DESC.
    await montar([pagina([acompanhamento(1, 'Encontrei a causa'), EVENTO, ABERTURA])]);

    expect(feed.feed).toHaveBeenCalledWith(10, 'DESC', { pagina: 0, tamanho: 20 });
    const textos = itens();
    expect(textos[0]).toContain('Bruno Lima');
    expect(textos[0]).toContain('abriu o chamado');
    expect(textos[0]).toContain('O relatório não abre');
    expect(textos[0]).toContain('erro.log');
    expect(textos[1]).toContain('Ana Dev mudou o status de Aberto para Em andamento');
    expect(textos[2]).toContain('Encontrei a causa');
  });

  it('acompanhamento de Solução tem selo e Markdown renderizado', async () => {
    await montar([pagina([acompanhamento(1, '**Corrigido** na v2', { tipo: 'SOLUCAO', tempoGastoMinutos: 90 })])]);
    const card = elemento.querySelector('app-card-acompanhamento') as HTMLElement;
    expect(card.querySelector('.selo-solucao')?.textContent).toBe('Solução');
    expect(card.querySelector('.texto-markdown strong')?.textContent).toBe('Corrigido');
    expect(card.textContent).toContain('1h 30min');
  });

  it('editar e excluir só aparecem com permissão', async () => {
    await montar([pagina([acompanhamento(2, 'Meu', { podeAlterar: true }), acompanhamento(1, 'De outra pessoa')])]);
    const cards = Array.from(elemento.querySelectorAll('app-card-acompanhamento'));
    const botoes = (card: Element) => Array.from(card.querySelectorAll('button')).map((b) => b.textContent!.trim());
    expect(botoes(cards[0])).not.toContain('Editar');
    expect(botoes(cards[1])).toEqual(expect.arrayContaining(['Editar', 'Excluir']));
  });

  it('busca os itens anteriores sob demanda e os coloca no topo', async () => {
    await montar([
      pagina([acompanhamento(3, 'Mais recente'), acompanhamento(2, 'Do meio')], 3, 2),
      pagina([ABERTURA], 3, 2, 1),
    ]);
    const botao = Array.from(elemento.querySelectorAll('button')).find((b) => b.textContent?.includes('anteriores'))!;
    expect(botao.textContent).toContain('(1)');

    botao.click();
    await fixture.whenStable();
    expect(feed.feed).toHaveBeenLastCalledWith(10, 'DESC', { pagina: 1, tamanho: 20 });
    const textos = itens();
    expect(textos[0]).toContain('abriu o chamado');
    expect(textos[2]).toContain('Mais recente');
    expect(elemento.textContent).not.toContain('anteriores');
  });

  it('projeto arquivado não mostra a caixa de novo acompanhamento', async () => {
    feed = { feed: vi.fn(() => of(pagina([ABERTURA]))) };
    TestBed.configureTestingModule({
      imports: [FeedChamado],
      providers: [
        { provide: FeedService, useValue: feed },
        { provide: AnexoService, useValue: anexoServiceFalso() },
      ],
    });
    fixture = TestBed.createComponent(FeedChamado);
    fixture.componentRef.setInput('chamadoId', 10);
    fixture.componentRef.setInput('versao', 0);
    fixture.componentRef.setInput('podeEscrever', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-novo-acompanhamento')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Projeto arquivado');
  });
});
