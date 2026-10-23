import { StatusChamado, Urgencia } from '../../core/models/chamado';

/**
 * Cores das séries de status (variáveis definidas em styles.css). Validadas para
 * a superfície escura padrão: faixa de luminosidade, croma e separação para daltonismo.
 */
export const COR_STATUS: Record<StatusChamado, string> = {
  ABERTO: 'var(--serie-aberto)',
  EM_ANDAMENTO: 'var(--serie-andamento)',
  CONCLUIDO: 'var(--serie-concluido)',
};

/** Urgência: Alta/Crítica na cor de destaque (pedido do produto); demais em tom neutro. */
export const COR_URGENCIA: Record<Urgencia, string> = {
  CRITICA: 'var(--cor-destaque)',
  ALTA: 'var(--cor-destaque)',
  MEDIA: 'var(--cor-texto-suave)',
  BAIXA: 'var(--cor-borda)',
};
