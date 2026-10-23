export type Perfil = 'ADMIN' | 'DESENVOLVEDOR';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
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
