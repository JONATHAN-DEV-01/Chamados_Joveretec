import { HttpErrorResponse } from '@angular/common/http';
import { ApiErro } from './api-erro';

describe('ApiErro', () => {
  it('usa o corpo padronizado do backend', () => {
    const erro = ApiErro.de(
      new HttpErrorResponse({
        status: 400,
        error: {
          codigo: 'VALIDACAO',
          mensagem: 'Dados inválidos.',
          detalhes: [{ campo: 'titulo', mensagem: 'O título é obrigatório.' }],
          timestamp: '2026-10-23T18:00:00Z',
        },
      }),
    );

    expect(erro.status).toBe(400);
    expect(erro.codigo).toBe('VALIDACAO');
    expect(erro.message).toBe('Dados inválidos.');
    expect(erro.detalhes).toEqual([{ campo: 'titulo', mensagem: 'O título é obrigatório.' }]);
  });

  it('trata falha de rede (status 0)', () => {
    const erro = ApiErro.de(new HttpErrorResponse({ status: 0 }));
    expect(erro.codigo).toBe('SEM_CONEXAO');
    expect(erro.message).toContain('conectar ao servidor');
  });

  it('tem mensagem genérica para respostas fora do padrão', () => {
    const erro = ApiErro.de(new HttpErrorResponse({ status: 502, error: '<html>Bad Gateway</html>' }));
    expect(erro.status).toBe(502);
    expect(erro.message).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('extrai mensagem de qualquer erro', () => {
    expect(ApiErro.mensagemDe(new ApiErro(409, 'CONFLITO', 'Conflito.'))).toBe('Conflito.');
    expect(ApiErro.mensagemDe('texto')).toBe('Ocorreu um erro inesperado.');
  });
});
