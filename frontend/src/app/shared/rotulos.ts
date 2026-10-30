import { Pipe, PipeTransform } from '@angular/core';
import { CampoHistorico, StatusChamado, Urgencia } from '../core/models/chamado';
import { Perfil } from '../core/models/usuario';

export const ROTULO_URGENCIA: Record<Urgencia, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

export const ROTULO_STATUS: Record<StatusChamado, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
};

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  DESENVOLVEDOR: 'Desenvolvedor',
};

export const ROTULO_CAMPO_HISTORICO: Record<CampoHistorico, string> = {
  CRIACAO: 'Criação',
  TITULO: 'Título',
  DESCRICAO: 'Descrição',
  URGENCIA: 'Urgência',
  STATUS: 'Status',
  RESPONSAVEL: 'Responsável',
  RESPONSAVEL_ADICIONADO: 'Responsável adicionado',
  RESPONSAVEL_REMOVIDO: 'Responsável removido',
  POSICAO: 'Posição na fila',
  ANEXO_ADICIONADO: 'Anexo adicionado',
  ANEXO_REMOVIDO: 'Anexo removido',
};

@Pipe({ name: 'rotuloUrgencia' })
export class RotuloUrgenciaPipe implements PipeTransform {
  transform(valor: Urgencia): string {
    return ROTULO_URGENCIA[valor] ?? valor;
  }
}

@Pipe({ name: 'rotuloStatus' })
export class RotuloStatusPipe implements PipeTransform {
  transform(valor: StatusChamado): string {
    return ROTULO_STATUS[valor] ?? valor;
  }
}

@Pipe({ name: 'rotuloPerfil' })
export class RotuloPerfilPipe implements PipeTransform {
  transform(valor: Perfil): string {
    return ROTULO_PERFIL[valor] ?? valor;
  }
}
