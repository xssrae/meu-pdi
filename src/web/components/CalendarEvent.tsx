import type { TipoEvento } from '../../domain/aggregates'
import type { CorTrilha } from '../../domain/types'
import { cn } from './cn'
import { classesEvento } from './tones'

/** Evento compacto de calendário (uma linha, truncada). */
export function CalendarEvent({ tipo, titulo, cor, className }: { tipo: TipoEvento; titulo: string; cor?: CorTrilha | null; className?: string }) {
  return <span className={cn('block truncate rounded-xs px-1.5 py-0.5 type-micro', classesEvento(tipo, cor), className)}>{titulo}</span>
}
