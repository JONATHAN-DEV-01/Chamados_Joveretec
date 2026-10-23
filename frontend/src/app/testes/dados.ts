import { Chamado, ChamadoResumo } from '../core/models/chamado';
import { Pagina } from '../core/models/comum';
import { LoginResponse, Usuario } from '../core/models/usuario';

/** Dados de exemplo compartilhados pelos testes. */
export const USUARIO_DEV: Usuario = {
  id: 7,
  nome: 'Ana Dev',
  email: 'ana@teste.local',
  perfil: 'DESENVOLVEDOR',
  ativo: true,
  criadoEm: '2026-10-01T10:00:00Z',
};

export const USUARIO_ADMIN: Usuario = { ...USUARIO_DEV, id: 1, nome: 'Admin', perfil: 'ADMIN' };

export function respostaLogin(usuario: Usuario = USUARIO_DEV, minutosParaExpirar = 60): LoginResponse {
  return {
    token: `token-${usuario.id}`,
    expiraEm: new Date(Date.now() + minutosParaExpirar * 60_000).toISOString(),
    usuario,
  };
}

export function chamadoResumo(id: number, posicao: number, titulo = `Chamado ${id}`): ChamadoResumo {
  return {
    id,
    titulo,
    urgencia: 'MEDIA',
    status: 'ABERTO',
    posicao,
    projeto: { id: 1, nome: 'Projeto' },
    responsavel: null,
    atualizadoEm: '2026-10-20T12:00:00Z',
  };
}

export function chamado(id = 10): Chamado {
  return {
    ...chamadoResumo(id, 1, 'Erro no login'),
    descricao: 'Descrição',
    criadoPor: { id: USUARIO_DEV.id, nome: USUARIO_DEV.nome },
    criadoEm: '2026-10-20T12:00:00Z',
    versao: 0,
  };
}

export function pagina<T>(itens: T[], totalItens = itens.length, tamanho = 20, numero = 0): Pagina<T> {
  return { itens, pagina: numero, tamanho, totalItens, totalPaginas: Math.ceil(totalItens / tamanho) };
}
