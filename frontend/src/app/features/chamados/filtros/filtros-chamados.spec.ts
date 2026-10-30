import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProjetoService } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { FiltrosChamados, MudancaDeFiltro, temFiltrosAtivos } from './filtros-chamados';

describe('FiltrosChamados', () => {
  async function montar(parametros: Record<string, string> = {}, mostrarProjeto = true) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProjetoService, useValue: { listarParaSelecao: () => of([{ id: 3, nome: 'Portal', arquivado: false }]) } },
        { provide: UsuarioService, useValue: { listarAtivos: () => of([]) } },
      ],
    });
    const fixture = TestBed.createComponent(FiltrosChamados);
    fixture.componentRef.setInput('parametros', parametros);
    fixture.componentRef.setInput('mostrarProjeto', mostrarProjeto);
    const emitidos: MudancaDeFiltro[] = [];
    fixture.componentInstance.filtrar.subscribe((m) => emitidos.push(m));
    await fixture.whenStable();
    return { fixture, elemento: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('liga e desliga chips de urgência somando ao que já está na URL', async () => {
    const { elemento, emitidos } = await montar({ urgencia: 'CRITICA' });
    const alta = Array.from(elemento.querySelectorAll('.chip')).find((c) => c.textContent!.trim() === 'Alta') as HTMLButtonElement;
    alta.click();
    const critica = Array.from(elemento.querySelectorAll('.chip')).find((c) => c.textContent!.trim() === 'Crítica') as HTMLButtonElement;
    expect(critica.getAttribute('aria-pressed')).toBe('true');
    critica.click();
    expect(emitidos).toEqual([{ urgencia: 'CRITICA,ALTA' }, { urgencia: null }]);
  });

  it('esconde o seletor de projeto quando a página já tem o seu', async () => {
    expect((await montar({}, true)).elemento.querySelector('#filtro-projeto')).not.toBeNull();
    TestBed.resetTestingModule();
    expect((await montar({}, false)).elemento.querySelector('#filtro-projeto')).toBeNull();
  });

  it('só mostra "Limpar filtros" com filtro ativo', async () => {
    expect((await montar({})).elemento.querySelector('.limpar')).toBeNull();
    TestBed.resetTestingModule();
    expect((await montar({ busca: 'x' })).elemento.querySelector('.limpar')).not.toBeNull();
  });

  it('o projeto só conta como filtro onde ele é um filtro', () => {
    expect(temFiltrosAtivos({ projetoId: '1' })).toBe(true);
    expect(temFiltrosAtivos({ projetoId: '1' }, false)).toBe(false);
    expect(temFiltrosAtivos({ projetoId: '1', status: 'ABERTO' }, false)).toBe(true);
    expect(temFiltrosAtivos({ pagina: '2' })).toBe(false);
  });
});
