import { Paleta } from './configuracao';
export type Perfil = 'ADMIN' | 'DESENVOLVEDOR';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
  /** Paleta pessoal: só vem para o próprio usuário (login e `/me`); `null` = segue a global. */
  paleta?: Paleta | null;
  /** Última versão das "Novidades da plataforma" que o usuário viu (login e `/me`). */
  novidadesVistasVersao?: number;
}

export interface LoginResponse {
  token: string;
  expiraEm: string;
  usuario: Usuario;
}

export interface CriarUsuarioRequest {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
}

export interface AtualizarUsuarioRequest {
  nome: string;
  email: string;
  perfil: Perfil;
  novaSenha?: string | null;
}

export interface FiltroUsuarios {
  busca?: string;
  ativo?: boolean | null;
  perfil?: Perfil | null;
}
