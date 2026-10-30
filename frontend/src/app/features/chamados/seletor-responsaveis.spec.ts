import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Usuario } from '../../core/models/usuario';
import { USUARIO_DEV } from '../../testes/dados';
import { Responsaveis } from '../../shared/componentes/responsaveis';
import { SeletorResponsaveis } from './seletor-responsaveis';

const CARLA: Usuario = { ...USUARIO_DEV, id: 2, nome: 'Carla Souza' };
const JOAO: Usuario = { ...USUARIO_DEV, id: 3, nome: 'João Lima' };

async function montar(valor: number[] = [], atuais: { id: number; nome: string }[] = []) {
  const controle = new FormControl<number[]>(valor, { nonNullable: true });
  const fixture = TestBed.createComponent(SeletorResponsaveis);
  fixture.componentRef.setInput('controle', controle);
  fixture.componentRef.setInput('usuarios', [USUARIO_DEV, CARLA, JOAO]);
  fixture.componentRef.setInput('eu', USUARIO_DEV);
  fixture.componentRef.setInput('atuais', atuais);
  await fixture.whenStable();
  const elemento = fixture.nativeElement as HTMLElement;
  const campo = elemento.querySelector('input') as HTMLInputElement;
  return { fixture, controle, elemento, campo };
}

function opcoes(elemento: HTMLElement): string[] {
  return Array.from(elemento.querySelectorAll('[role="option"]')).map((li) => li.textContent!.trim());
}

describe('SeletorResponsaveis', () => {
  it('mostra "eu mesmo" primeiro e busca sem diferenciar acentos', async () => {
    const { fixture, elemento, campo } = await montar();
    campo.dispatchEvent(new Event('focus'));
    await fixture.whenStable();
    expect(opcoes(elemento)[0]).toContain('Eu mesmo');

    campo.value = 'joao';
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const encontradas = opcoes(elemento);
    expect(encontradas.length).toBe(1);
    expect(encontradas[0]).toContain('João Lima');
  });

  it('adiciona pelo teclado, tira da lista de sugestões e remove pelo chip', async () => {
    const { fixture, controle, elemento, campo } = await montar();
    campo.dispatchEvent(new Event('focus'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(controle.value).toEqual([CARLA.id]);
    expect(opcoes(elemento).some((o) => o.includes('Carla'))).toBe(false);

    (elemento.querySelector('button[aria-label="Remover Carla Souza"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(controle.value).toEqual([]);
    expect(controle.dirty).toBe(true);
  });

  it('Backspace com a busca vazia remove o último escolhido', async () => {
    const { fixture, controle, campo } = await montar([CARLA.id, JOAO.id]);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    await fixture.whenStable();
    expect(controle.value).toEqual([CARLA.id]);
  });

  it('mantém o responsável inativo como chip, mas não o oferece de novo', async () => {
    const inativo = { id: 99, nome: 'Bruno Antigo' };
    const { fixture, controle, elemento, campo } = await montar([99], [inativo]);
    expect(elemento.textContent).toContain('Bruno Antigo (inativo)');

    controle.setValue([]);
    campo.dispatchEvent(new Event('focus'));
    await fixture.whenStable();
    expect(opcoes(elemento).some((o) => o.includes('Bruno'))).toBe(false);
  });
});

describe('Responsaveis', () => {
  async function montarPilha(quantidade: number) {
    const fixture = TestBed.createComponent(Responsaveis);
    const pessoas = Array.from({ length: quantidade }, (_, i) => ({ id: i + 1, nome: `Pessoa ${i + 1}` }));
    fixture.componentRef.setInput('responsaveis', pessoas);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('sem ninguém mostra "Sem responsável"', async () => {
    expect((await montarPilha(0)).textContent?.trim()).toBe('Sem responsável');
  });

  it('com um só mostra o nome', async () => {
    expect((await montarPilha(1)).textContent).toContain('Pessoa 1');
  });

  it('com muitos mostra os três primeiros avatares e +N, com todos os nomes no title', async () => {
    const elemento = await montarPilha(5);
    expect(elemento.querySelectorAll('app-avatar').length).toBe(3);
    expect(elemento.querySelector('.mais')?.textContent?.trim()).toBe('+2');
    expect(elemento.querySelector('.pilha')?.getAttribute('title')).toBe(
      'Pessoa 1, Pessoa 2, Pessoa 3, Pessoa 4, Pessoa 5',
    );
  });
});
