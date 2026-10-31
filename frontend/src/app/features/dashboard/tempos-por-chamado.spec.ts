import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TemposDashboard } from '../../core/models/dashboard';
import { TemposPorChamado } from './tempos-por-chamado';

describe('TemposPorChamado', () => {
  const DIA = 86400;
  const HORA = 3600;

  async function montar(tempos: TemposDashboard) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TemposPorChamado);
    fixture.componentRef.setInput('tempos', tempos);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra as médias, a média por responsável e os abertos há mais tempo', async () => {
    const elemento = await montar({
      concluidos: 2,
      resolucaoMediaSegundos: 2 * DIA + 4 * HORA,
      andamentoMedioSegundos: 5 * HORA,
      porResponsavel: [
        { usuario: { id: 1, nome: 'Ana' }, concluidos: 2, resolucaoMediaSegundos: DIA, andamentoMedioSegundos: 3 * HORA },
      ],
      abertosHaMaisTempo: [
        {
          chamado: { id: 7, titulo: 'Login lento' },
          status: 'EM_ANDAMENTO',
          urgencia: 'ALTA',
          criadoEm: '2026-10-01T12:00:00Z',
          abertoHaSegundos: 12 * DIA + 3 * HORA,
          emAndamentoSegundos: 2 * HORA,
        },
      ],
    });

    const valores = Array.from(elemento.querySelectorAll('.indicador .valor'), (e) => e.textContent?.trim());
    expect(valores).toEqual(['2d 4h', '5h', '2']);
    expect(elemento.querySelector('tbody tr')?.textContent).toContain('Ana');
    expect(elemento.querySelector('tbody tr')?.textContent).toContain('1d');
    const antigo = elemento.querySelector('.antigos li') as HTMLElement;
    expect(antigo.querySelector('a')?.getAttribute('href')).toBe('/chamados/7');
    expect(antigo.textContent).toContain('há 12d 3h');
    expect(antigo.textContent).toContain('2h em andamento');
  });

  it('sem concluídos, mostra traço nas médias e avisos nas listas', async () => {
    const elemento = await montar({
      concluidos: 0,
      resolucaoMediaSegundos: null,
      andamentoMedioSegundos: null,
      porResponsavel: [],
      abertosHaMaisTempo: [],
    });

    const valores = Array.from(elemento.querySelectorAll('.indicador .valor'), (e) => e.textContent?.trim());
    expect(valores).toEqual(['—', '—', '0']);
    expect(elemento.textContent).toContain('Nenhum chamado concluído com responsável ainda.');
    expect(elemento.textContent).toContain('Nenhum chamado em aberto.');
  });
});
