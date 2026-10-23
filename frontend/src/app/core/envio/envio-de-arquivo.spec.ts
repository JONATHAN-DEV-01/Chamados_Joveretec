import { of, throwError } from 'rxjs';
import { anexoServiceFalso, arquivo, fabricaFalsa } from '../../testes/transporte-falso';
import { ApiErro } from '../api/api-erro';
import { AnexoService } from '../api/anexo.service';
import { EnvioDeArquivo } from './envio-de-arquivo';
import { FilaDeEnvios } from './fila-de-envios';
import { MENSAGEM_LIMITE, mensagemDoStatus } from './transporte';

describe('EnvioDeArquivo', () => {
  const destino = () => of({ chamadoId: 5, acompanhamentoId: 9 });

  function criar() {
    const anexos = anexoServiceFalso();
    const { fabrica, criados } = fabricaFalsa();
    const envio = new EnvioDeArquivo(arquivo('log.txt', 'abcdef'), anexos as unknown as AnexoService, fabrica);
    return { envio, anexos, criados };
  }

  it('solicita autorização, envia com progresso e confirma no backend', () => {
    const { envio, anexos, criados } = criar();
    envio.iniciar(destino());

    expect(anexos.solicitarEnvio).toHaveBeenCalledWith(5, {
      nome: 'log.txt',
      tipoMime: 'text/plain',
      tamanhoBytes: 6,
      acompanhamentoId: 9,
    });
    expect(envio.estado()).toBe('enviando');
    expect(criados[0].inicios).toBe(1);

    criados[0].eventos.progresso(3, 6);
    expect(envio.progresso()).toBe(0.5);
    expect(envio.pendente()).toBe(true);

    criados[0].eventos.sucesso();
    expect(anexos.confirmar).toHaveBeenCalledWith(100);
    expect(envio.estado()).toBe('concluido');
    expect(envio.anexo()?.status).toBe('CONCLUIDO');
    expect(envio.pendente()).toBe(false);
  });

  it('cancela (pausa) e retoma do ponto em que parou', () => {
    const { envio, criados } = criar();
    envio.iniciar(destino());
    envio.cancelar();
    expect(envio.estado()).toBe('pausado');
    expect(criados[0].pausas).toBe(1);

    // Erro disparado pelo abort não é mostrado ao usuário.
    criados[0].eventos.falha('abortado');
    expect(envio.estado()).toBe('pausado');

    envio.retomar();
    expect(envio.estado()).toBe('enviando');
    expect(criados).toHaveLength(1);
    expect(criados[0].inicios).toBe(2);
  });

  it('mostra a falha e permite retomar', () => {
    const { envio, criados } = criar();
    envio.iniciar(destino());
    criados[0].eventos.falha(MENSAGEM_LIMITE);
    expect(envio.estado()).toBe('erro');
    expect(envio.erro()).toBe(MENSAGEM_LIMITE);

    envio.retomar();
    expect(envio.estado()).toBe('enviando');
    expect(envio.erro()).toBeNull();
  });

  it('se a confirmação falhar, retomar só confirma de novo (não reenvia)', () => {
    const { envio, anexos, criados } = criar();
    anexos.confirmar.mockReturnValueOnce(throwError(() => new ApiErro(422, 'REGRA_NEGOCIO', 'Ainda não chegou.')));
    envio.iniciar(destino());
    criados[0].eventos.sucesso();
    expect(envio.estado()).toBe('erro');

    envio.retomar();
    expect(anexos.confirmar).toHaveBeenCalledTimes(2);
    expect(criados[0].inicios).toBe(1);
    expect(envio.estado()).toBe('concluido');
  });

  it('falha na autorização vira erro com a mensagem do backend', () => {
    const { envio, anexos } = criar();
    anexos.solicitarEnvio.mockReturnValueOnce(throwError(() => new ApiErro(422, 'REGRA_NEGOCIO', 'Projeto arquivado.')));
    envio.iniciar(destino());
    expect(envio.estado()).toBe('erro');
    expect(envio.erro()).toBe('Projeto arquivado.');
  });

  it('remover interrompe e exclui o anexo no backend', () => {
    const { envio, anexos, criados } = criar();
    envio.iniciar(destino());
    envio.remover().subscribe();
    expect(criados[0].pausas).toBe(1);
    expect(anexos.excluir).toHaveBeenCalledWith(100);
  });

  it('traduz recusa por tamanho do Storage em mensagem clara', () => {
    expect(mensagemDoStatus(413, '')).toBe(MENSAGEM_LIMITE);
    expect(mensagemDoStatus(400, '{"error":"Payload too large"}')).toBe(MENSAGEM_LIMITE);
    expect(mensagemDoStatus(0, '')).toContain('conexão');
  });
});

describe('FilaDeEnvios', () => {
  it('com destino, envia ao adicionar; publica só quando todos concluírem', () => {
    const anexos = anexoServiceFalso();
    const { fabrica, criados } = fabricaFalsa();
    const fila = new FilaDeEnvios(anexos as unknown as AnexoService, () => of({ chamadoId: 1, acompanhamentoId: 2 }), fabrica);

    fila.adicionar([arquivo('a.txt'), arquivo('b.txt')]);
    expect(fila.pendente()).toBe(true);
    expect(fila.prontos()).toBe(false);

    criados.forEach((t) => t.eventos.sucesso());
    expect(fila.pendente()).toBe(false);
    expect(fila.prontos()).toBe(true);
  });

  it('sem destino, aguarda iniciarTodos (novo chamado)', () => {
    const anexos = anexoServiceFalso();
    const { fabrica } = fabricaFalsa();
    const fila = new FilaDeEnvios(anexos as unknown as AnexoService, null, fabrica);

    fila.adicionar([arquivo()]);
    expect(anexos.solicitarEnvio).not.toHaveBeenCalled();
    expect(fila.envios()[0].estado()).toBe('aguardando');

    fila.iniciarTodos(() => of({ chamadoId: 42, acompanhamentoId: null }));
    expect(anexos.solicitarEnvio).toHaveBeenCalledWith(42, expect.objectContaining({ acompanhamentoId: null }));
  });

  it('remover tira o arquivo da fila e marca erro deixa de bloquear quando removido', () => {
    const anexos = anexoServiceFalso();
    const { fabrica, criados } = fabricaFalsa();
    const fila = new FilaDeEnvios(anexos as unknown as AnexoService, () => of({ chamadoId: 1, acompanhamentoId: 2 }), fabrica);
    fila.adicionar([arquivo()]);
    criados[0].eventos.falha('Falhou');
    expect(fila.comErro()).toBe(true);

    fila.remover(fila.envios()[0]);
    expect(fila.vazia()).toBe(true);
    expect(fila.comErro()).toBe(false);
  });
});
