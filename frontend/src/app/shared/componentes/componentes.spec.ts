import { TestBed } from '@angular/core/testing';
import { pagina } from '../../testes/dados';
import { BadgeStatus, BadgeUrgencia } from './badges';
import { BotaoConfirmar } from './botao-confirmar';
import { Paginacao } from './paginacao';

describe('componentes compartilhados', () => {
  it('badge de urgência mostra o rótulo e marca Crítica com destaque', async () => {
    const fixture = TestBed.createComponent(BadgeUrgencia);
    fixture.componentRef.setInput('urgencia', 'CRITICA');
    await fixture.whenStable();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(span.textContent?.trim()).toBe('Crítica');
    expect(span.className).toBe('u-critica');
  });

  it('badge de status mostra o rótulo em português', async () => {
    const fixture = TestBed.createComponent(BadgeStatus);
    fixture.componentRef.setInput('status', 'EM_ANDAMENTO');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent.trim()).toBe('Em andamento');
  });

  it('paginação mostra o intervalo e emite a próxima página', async () => {
    const fixture = TestBed.createComponent(Paginacao);
    fixture.componentRef.setInput('pagina', pagina([1, 2], 45, 20, 1));
    const emitidas: number[] = [];
    fixture.componentInstance.mudar.subscribe((p) => emitidas.push(p));
    await fixture.whenStable();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.textContent).toContain('21–22 de 45');
    expect(elemento.textContent).toContain('Página 2 de 3');

    const [anterior, proxima] = Array.from(elemento.querySelectorAll('button'));
    proxima.click();
    anterior.click();
    expect(emitidas).toEqual([2, 0]);
  });

  it('botão de confirmação só emite no segundo clique', async () => {
    const fixture = TestBed.createComponent(BotaoConfirmar);
    fixture.componentRef.setInput('texto', 'Arquivar');
    fixture.componentRef.setInput('textoConfirmacao', 'Confirmar arquivamento');
    let confirmacoes = 0;
    fixture.componentInstance.confirmado.subscribe(() => confirmacoes++);
    await fixture.whenStable();

    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    botao.click();
    await fixture.whenStable();
    expect(botao.textContent?.trim()).toBe('Confirmar arquivamento');
    expect(confirmacoes).toBe(0);

    botao.click();
    await fixture.whenStable();
    expect(confirmacoes).toBe(1);
    expect(botao.textContent?.trim()).toBe('Arquivar');
  });
});
