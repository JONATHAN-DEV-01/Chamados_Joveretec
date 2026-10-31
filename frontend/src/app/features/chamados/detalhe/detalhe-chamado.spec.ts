import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ChamadoService } from '../../../core/api/chamado.service';
import { FeedService } from '../../../core/api/feed.service';
import { ProjetoService } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { Usuario } from '../../../core/models/usuario';
import { USUARIO_ADMIN, USUARIO_DEV, chamado, pagina, respostaLogin } from '../../../testes/dados';
import { DetalheChamado } from './detalhe-chamado';

describe('DetalheChamado: excluir', () => {
  afterEach(() => sessionStorage.clear());

  async function montar(usuario: Usuario, arquivado = false) {
    sessionStorage.setItem('chamados.sessao', JSON.stringify(respostaLogin(usuario)));
    const chamados = { buscar: vi.fn(() => of(chamado(10))), excluir: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChamadoService, useValue: chamados },
        { provide: ProjetoService, useValue: { buscar: () => of({ id: 1, nome: 'Projeto', arquivado }) } },
        { provide: UsuarioService, useValue: { listarAtivos: () => of([]) } },
        // O feed não importa aqui: qualquer consulta dele volta vazia.
        { provide: FeedService, useValue: new Proxy({}, { get: () => () => of(pagina([])) }) },
      ],
    });
    const fixture = TestBed.createComponent(DetalheChamado);
    fixture.componentRef.setInput('id', '10');
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    const botao = () =>
      Array.from(elemento.querySelectorAll('button')).find((b) => /Excluir chamado|Confirmar exclusão/.test(b.textContent ?? ''));
    return { fixture, chamados, botao };
  }

  it('só o administrador vê o botão', async () => {
    expect((await montar(USUARIO_DEV)).botao()).toBeUndefined();
    TestBed.resetTestingModule();
    expect((await montar(USUARIO_ADMIN)).botao()).toBeDefined();
  });

  it('não aparece com o projeto arquivado', async () => {
    expect((await montar(USUARIO_ADMIN, true)).botao()).toBeUndefined();
  });

  it('pede confirmação, exclui e volta para a lista', async () => {
    const { fixture, chamados, botao } = await montar(USUARIO_ADMIN);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    botao()!.click();
    await fixture.whenStable();
    expect(chamados.excluir).not.toHaveBeenCalled();
    expect(botao()!.textContent).toContain('Confirmar exclusão');

    botao()!.click();
    await fixture.whenStable();
    expect(chamados.excluir).toHaveBeenCalledWith(10);
    expect(navegar).toHaveBeenCalledWith(['/chamados']);
  });
});
