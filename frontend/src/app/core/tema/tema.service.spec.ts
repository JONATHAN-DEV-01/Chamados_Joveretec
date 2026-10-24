import { TestBed } from '@angular/core/testing';
import { TemaService } from './tema.service';

describe('TemaService', () => {
  let servico: TemaService;

  beforeEach(() => {
    servico = TestBed.inject(TemaService);
  });

  it('aplica as 4 cores e a cor de texto sobre o destaque como variáveis CSS', () => {
    const elemento = document.createElement('div');
    servico.aplicar({ fundo: '#101010', superficie: '#333333', destaque: '#FFCC00', texto: '#FAFAFA' }, elemento);

    expect(elemento.style.getPropertyValue('--cor-fundo')).toBe('#101010');
    expect(elemento.style.getPropertyValue('--cor-superficie')).toBe('#333333');
    expect(elemento.style.getPropertyValue('--cor-destaque')).toBe('#FFCC00');
    expect(elemento.style.getPropertyValue('--cor-texto')).toBe('#FAFAFA');
    expect(elemento.style.getPropertyValue('--cor-sobre-destaque')).toBe('#000000');
  });

  it('usa :root por padrão', () => {
    servico.aplicar({ fundo: '#171717', superficie: '#444444', destaque: '#DA0037', texto: '#EDEDED' });
    expect(document.documentElement.style.getPropertyValue('--cor-destaque')).toBe('#DA0037');
  });

  it('guarda a paleta global para a próxima abertura (splash do index.html)', () => {
    localStorage.removeItem('chamados.paleta');
    const paleta = { fundo: '#0F172A', superficie: '#334155', destaque: '#1E88E5', texto: '#F8FAFC' };
    servico.aplicar(paleta);
    expect(JSON.parse(localStorage.getItem('chamados.paleta')!)).toEqual(paleta);

    // A pré-visualização (elemento local) não sobrescreve a paleta guardada.
    servico.aplicar({ ...paleta, destaque: '#FF0000' }, document.createElement('div'));
    expect(JSON.parse(localStorage.getItem('chamados.paleta')!).destaque).toBe('#1E88E5');
  });

  it('ignora paletas com cor inválida', () => {
    const elemento = document.createElement('div');
    servico.aplicar({ fundo: 'preto', superficie: '#333333', destaque: '#FFCC00', texto: '#FAFAFA' }, elemento);
    expect(elemento.style.getPropertyValue('--cor-superficie')).toBe('');
  });
});
