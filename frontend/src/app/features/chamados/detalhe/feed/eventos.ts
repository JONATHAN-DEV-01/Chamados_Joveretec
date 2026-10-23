import { Historico } from '../../../../core/models/chamado';
import { ItemFeed } from '../../../../core/models/feed';
import { ROTULO_STATUS, ROTULO_URGENCIA } from '../../../../shared/rotulos';

/** Frase do evento automático, sem o nome do autor ("mudou o status de Aberto para Em andamento"). */
export function descreverEvento({ campo, valorAnterior: antes, valorNovo: depois }: Historico): string {
  switch (campo) {
    case 'STATUS':
      return `mudou o status de ${rotulo(ROTULO_STATUS, antes)} para ${rotulo(ROTULO_STATUS, depois)}`;
    case 'URGENCIA':
      return `mudou a urgência de ${rotulo(ROTULO_URGENCIA, antes)} para ${rotulo(ROTULO_URGENCIA, depois)}`;
    case 'RESPONSAVEL':
      if (!antes) return `atribuiu o chamado a ${depois}`;
      if (!depois) return `removeu o responsável (${antes})`;
      return `mudou o responsável de ${antes} para ${depois}`;
    case 'POSICAO':
      return `moveu o chamado na fila de #${antes} para #${depois}`;
    case 'TITULO':
      return `alterou o título de “${antes}” para “${depois}”`;
    case 'DESCRICAO':
      return 'editou a descrição do chamado';
    case 'ANEXO_ADICIONADO':
      return `anexou “${depois}”`;
    case 'ANEXO_REMOVIDO':
      return `removeu o anexo “${antes}”`;
    case 'CRIACAO':
      return 'abriu o chamado';
  }
}

function rotulo<T extends string>(rotulos: Record<T, string>, valor: string | null): string {
  return valor ? (rotulos[valor as T] ?? valor) : '—';
}

/** Chave estável para o @for do feed. */
export function chaveDoItem(item: ItemFeed): string {
  switch (item.tipo) {
    case 'ABERTURA':
      return 'abertura';
    case 'ACOMPANHAMENTO':
      return `a-${item.acompanhamento.id}`;
    case 'EVENTO':
      return `e-${item.evento.id}`;
  }
}
