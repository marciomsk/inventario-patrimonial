import { Badge } from './Card';
import type { EventResult } from '../domain/types';
import { RESULT_LABELS } from '../domain/constants';

const tones: Record<EventResult, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  encontrado: 'success',
  divergente: 'warning',
  nao_cadastrado: 'danger',
  duplicado_cadastro: 'info',
  invalido: 'neutral',
};

export function ResultBadge({ resultado }: { resultado: EventResult }) {
  return <Badge tone={tones[resultado]}>{RESULT_LABELS[resultado]}</Badge>;
}
