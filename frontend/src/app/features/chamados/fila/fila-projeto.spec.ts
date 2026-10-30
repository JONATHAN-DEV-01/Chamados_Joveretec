import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiErro } from '../../../core/api/api-erro';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ProjetoService } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { chamado, chamadoResumo, pagina } from '../../../testes/dados';
import { FilaProjeto } from './fila-projeto';

describe('FilaProjeto', () => {
  let fixture: ComponentFixture<FilaProjeto>;
  let chamados: { listar: ReturnType<typeof vi.fn>; reordenar: ReturnType<typeof vi.fn> };
  const fila = [chamadoResumo(1, 1, 'Primeiro'), chamadoResumo(2, 2, 'Segundo'), chamadoResumo(3, 3, 'Terceiro')];

  async function montar(filtros: Record<string, string> = {}): Promise<HTMLElement> {
    chamados = {
      listar: vi.fn(() => of(pagina(fila))),
      reordenar: vi.fn(() => of(chamado())),
    };
    TestBed.configureTestingModule({
      imports: [FilaProjeto],
      providers: [
        provideRouter([]),
        { provide: ChamadoService, useValue: chamados },
        { provide: ProjetoService, useValue: { listarParaSelecao: () => of([]) } },
        { provide: UsuarioService, useValue: { listarAtivos: () => of([]) } },
      ],
    });
    fixture = TestBed.createComponent(FilaProjeto);
    fixture.componentRef.setInput('projetoId', '1');
    for (const [nome, valor] of Object.entries(filtros)) {
      fixture.componentRef.setInput(nome, valor);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function titulos(elemento: HTMLElement): string[] {
    return Array.from(elemento.querySelectorAll('.conteudo a')).map((a) => a.textContent!.trim());
  }

  it('lista só os chamados ativos do projeto, em ordem de posição', async () => {
    const elemento = await montar();
    expect(chamados.listar).toHaveBeenCalledWith(
      expect.objectContaining({ projetoId: 1, status: ['ABERTO', 'EM_ANDAMENTO'], ordem: 'POSICAO' }),
      { tamanho: 100 },
    );
    expect(titulos(elemento)).toEqual(['Primeiro', 'Segundo', 'Terceiro']);
    expect(elemento.textContent).not.toContain('reordenação fica desligada');
  });

  it('oferece só os chips de status Aberto e Em andamento', async () => {
    const elemento = await montar();
    const chips = Array.from(elemento.querySelectorAll('[aria-labelledby="rotulo-status"] .chip'));
    expect(chips.map((c) => c.textContent!.trim())).toEqual(['Aberto', 'Em andamento']);
  });

  it('aplica os filtros da URL e desliga a reordenação com aviso', async () => {
    const elemento = await montar({ urgencia: 'CRITICA', status: 'EM_ANDAMENTO', busca: 'login' });
    expect(chamados.listar).toHaveBeenCalledWith(
      expect.objectContaining({ projetoId: 1, urgencia: ['CRITICA'], status: ['EM_ANDAMENTO'], busca: 'login' }),
      { tamanho: 100 },
    );
    expect(elemento.textContent).toContain('reordenação fica desligada');
    const setas = Array.from(elemento.querySelectorAll('.setas button')) as HTMLButtonElement[];
    expect(setas.every((b) => b.disabled)).toBe(true);

    (elemento.querySelector('[aria-label="Descer Primeiro"]') as HTMLButtonElement).click();
    expect(chamados.reordenar).not.toHaveBeenCalled();
  });

  it('"Limpar filtros" mantém o projeto escolhido', async () => {
    const elemento = await montar({ urgencia: 'ALTA' });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (elemento.querySelector('.limpar') as HTMLButtonElement).click();
    expect(navegar).toHaveBeenCalledWith([], { queryParams: { projetoId: '1' } });
  });

  it('"descer" move o chamado e envia a nova posição (1-based)', async () => {
    const elemento = await montar();
    const descerPrimeiro = elemento.querySelector('[aria-label="Descer Primeiro"]') as HTMLButtonElement;
    descerPrimeiro.click();
    await fixture.whenStable();

    expect(chamados.reordenar).toHaveBeenCalledWith(1, 2);
    expect(chamados.listar).toHaveBeenCalledTimes(2);
  });

  it('desabilita subir no primeiro e descer no último', async () => {
    const elemento = await montar();
    expect((elemento.querySelector('[aria-label="Subir Primeiro"]') as HTMLButtonElement).disabled).toBe(true);
    expect((elemento.querySelector('[aria-label="Descer Terceiro"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('avisa e recarrega a fila se a reordenação falhar', async () => {
    const elemento = await montar();
    const erro = vi.spyOn(TestBed.inject(NotificacaoService), 'erro');
    chamados.reordenar.mockReturnValue(throwError(() => new ApiErro(422, 'REGRA_NEGOCIO', 'Projeto arquivado.')));

    (elemento.querySelector('[aria-label="Subir Terceiro"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(erro).toHaveBeenCalled();
    expect(chamados.listar).toHaveBeenCalledTimes(2);
    expect(titulos(elemento)).toEqual(['Primeiro', 'Segundo', 'Terceiro']);
  });
});
