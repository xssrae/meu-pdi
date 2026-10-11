import type { EstadoMeta, Prioridade, StatusAcao, StatusCompetencia, TipoFeedback } from '../../domain/types'
import { cn } from './cn'
import { TOM_ESTADO_META, TOM_PRIORIDADE, TOM_STATUS_ACAO, TOM_STATUS_COMPETENCIA, TOM_TIPO_FEEDBACK, type Tom } from './tones'

type Props =
  | { variante: 'acao-status'; valor: StatusAcao }
  | { variante: 'meta-estado'; valor: EstadoMeta }
  | { variante: 'feedback-tipo'; valor: TipoFeedback }
  | { variante: 'prioridade'; valor: Prioridade }
  | { variante: 'competencia-status'; valor: StatusCompetencia }

function tomDe(p: Props): Tom {
  switch (p.variante) {
    case 'acao-status':
      return TOM_STATUS_ACAO[p.valor]
    case 'meta-estado':
      return TOM_ESTADO_META[p.valor]
    case 'feedback-tipo':
      return TOM_TIPO_FEEDBACK[p.valor]
    case 'prioridade':
      return TOM_PRIORIDADE[p.valor]
    case 'competencia-status':
      return TOM_STATUS_COMPETENCIA[p.valor]
  }
}

/** Pílula de estado: sempre ponto + texto, nunca só cor. */
export function StatusPill(props: Props & { className?: string }) {
  const tom = tomDe(props)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 type-caption font-medium whitespace-nowrap', tom.bg, tom.fg, props.className)}>
      <span aria-hidden="true" className={cn('size-[7px] shrink-0 rounded-full', tom.dot)} />
      {tom.label}
    </span>
  )
}
