import { CampoHistorico, Historico } from '../../../../core/models/chamado';
import { descreverEvento } from './eventos';

function evento(campo: CampoHistorico, valorAnterior: string | null, valorNovo: string | null): Historico {
  return { id: 1, campo, valorAnterior, valorNovo, usuario: { id: 1, nome: 'Ana' }, alteradoEm: '2026-10-23T12:00:00Z' };
}

describe('descreverEvento', () => {
  it('usa os rótulos em português para status e urgência', () => {
    expect(descreverEvento(evento('STATUS', 'ABERTO', 'EM_ANDAMENTO'))).toBe(
      'mudou o status de Aberto para Em andamento',
    );
    expect(descreverEvento(evento('URGENCIA', 'BAIXA', 'CRITICA'))).toBe('mudou a urgência de Baixa para Crítica');
  });

  it('descreve atribuição, troca e remoção de responsável', () => {
    expect(descreverEvento(evento('RESPONSAVEL', null, 'Bruno'))).toBe('atribuiu o chamado a Bruno');
    expect(descreverEvento(evento('RESPONSAVEL', 'Bruno', 'Ana'))).toBe('mudou o responsável de Bruno para Ana');
    expect(descreverEvento(evento('RESPONSAVEL', 'Bruno', null))).toBe('removeu o responsável (Bruno)');
    expect(descreverEvento(evento('RESPONSAVEL_ADICIONADO', null, 'Ana'))).toBe('adicionou Ana como responsável');
    expect(descreverEvento(evento('RESPONSAVEL_REMOVIDO', 'Bruno', null))).toBe('removeu Bruno dos responsáveis');
  });

  it('descreve fila e anexos', () => {
    expect(descreverEvento(evento('POSICAO', '1', '3'))).toBe('moveu o chamado na fila de #1 para #3');
    expect(descreverEvento(evento('ANEXO_ADICIONADO', null, 'log.txt'))).toBe('anexou “log.txt”');
    expect(descreverEvento(evento('ANEXO_REMOVIDO', 'log.txt', null))).toBe('removeu o anexo “log.txt”');
  });
});
