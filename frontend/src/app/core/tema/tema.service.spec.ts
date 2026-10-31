import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { Paleta } from '../models/configuracao';
import { Usuario } from '../models/usuario';
import { CHAVE_PALETA_LOCAL, TemaService } from './tema.service';

describe('TemaService', () => {
  const GLOBAL: Paleta = { fundo: '#0F172A', superficie: '#334155', destaque: '#1E88E5', texto: '#F8FAFC' };
  const PESSOAL: Paleta = { fundo: '#101010', superficie: '#333333', destaque: '#FFCC00', texto: '#FAFAFA' };
  const raiz = () => document.documentElement.style;

  let servico: TemaService;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    servico = TestBed.inject(TemaService);
    auth = TestBed.inject(AuthService);
  });

  function entrarCom(paleta: Paleta | null): void {
    const usuario: Usuario = {
      id: 1, nome: 'Ana', email: 'ana@x.com', perfil: 'DESENVOLVEDOR', ativo: true, criadoEm: '', paleta,
    };
    sessionStorage.setItem('chamados.sessao', JSON.stringify({ token: 't', expiraEm: '2999-01-01T00:00:00Z', usuario }));
    // Recria o AuthService para ler a sessão guardada, como numa nova abertura do app.
    TestBed.resetTestingModule();
    servico = TestBed.inject(TemaService);
    auth = TestBed.inject(AuthService);
    TestBed.tick();
  }

  it('aplica as 4 cores e a cor de texto sobre o destaque num elemento (pré-visualização)', () => {
    const elemento = document.createElement('div');
    servico.aplicar(PESSOAL, elemento);

    expect(elemento.style.getPropertyValue('--cor-fundo')).toBe('#101010');
    expect(elemento.style.getPropertyValue('--cor-superficie')).toBe('#333333');
    expect(elemento.style.getPropertyValue('--cor-destaque')).toBe('#FFCC00');
    expect(elemento.style.getPropertyValue('--cor-texto')).toBe('#FAFAFA');
    expect(elemento.style.getPropertyValue('--cor-sobre-destaque')).toBe('#000000');
  });

  it('a paleta global vai para a página e fica guardada para a próxima abertura (tela de login)', () => {
    servico.definirGlobal(GLOBAL);

    expect(raiz().getPropertyValue('--cor-destaque')).toBe('#1E88E5');
    expect(JSON.parse(localStorage.getItem(CHAVE_PALETA_LOCAL)!)).toEqual(GLOBAL);
  });

  it('a paleta pessoal do usuário logado fica por cima da global, sem ser guardada como global', () => {
    entrarCom(PESSOAL);
    servico.definirGlobal(GLOBAL);

    expect(raiz().getPropertyValue('--cor-destaque')).toBe('#FFCC00');
    expect(JSON.parse(localStorage.getItem(CHAVE_PALETA_LOCAL)!)).toEqual(GLOBAL);
  });

  it('ao sair, a página volta para a paleta global', () => {
    entrarCom(PESSOAL);
    servico.definirGlobal(GLOBAL);

    auth.encerrar();
    TestBed.tick();

    expect(raiz().getPropertyValue('--cor-destaque')).toBe('#1E88E5');
  });

  it('salvar ou restaurar a paleta em "Meu perfil" muda a página na hora', () => {
    entrarCom(null);
    servico.definirGlobal(GLOBAL);
    expect(raiz().getPropertyValue('--cor-fundo')).toBe('#0F172A');

    auth.atualizarUsuario({ ...auth.usuario()!, paleta: PESSOAL });
    TestBed.tick();
    expect(raiz().getPropertyValue('--cor-fundo')).toBe('#101010');

    auth.atualizarUsuario({ ...auth.usuario()!, paleta: null });
    TestBed.tick();
    expect(raiz().getPropertyValue('--cor-fundo')).toBe('#0F172A');
  });

  it('ignora paletas com cor inválida', () => {
    const elemento = document.createElement('div');
    servico.aplicar({ ...PESSOAL, fundo: 'preto' }, elemento);
    expect(elemento.style.getPropertyValue('--cor-superficie')).toBe('');

    servico.definirGlobal(GLOBAL);
    servico.definirPessoal({ ...PESSOAL, destaque: '#FFF' });
    expect(raiz().getPropertyValue('--cor-destaque')).toBe('#1E88E5');
  });
});
