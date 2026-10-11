import { Link } from 'react-router'
import type { CorTrilha } from '../../domain/types'
import { cn } from './cn'
import { TOM_TRILHA } from './tones'

interface Props {
  cor: CorTrilha
  rotulo: string
  /** Nome completo, para o tooltip quando o rótulo é curto. */
  titulo?: string
  to?: string
  /** `mono` para IDs (T1), `texto` para nomes. */
  estilo?: 'mono' | 'texto'
  className?: string
}

/** Identidade da trilha em chip: corpo da cor da trilha, texto no tom escuro. Nunca indica estado. */
export function TrilhaChip({ cor, rotulo, titulo, to, estilo = 'texto', className }: Props) {
  const tom = TOM_TRILHA[cor]
  const classes = cn(
    'inline-flex items-center rounded-xs px-2 py-0.5 whitespace-nowrap no-underline',
    estilo === 'mono' ? 'type-mono' : 'type-caption',
    tom.bg,
    tom.fg,
    to && 'hover:underline',
    className,
  )
  return to ? (
    <Link to={to} title={titulo} aria-label={titulo ? `${rotulo}: ${titulo}` : undefined} className={classes}>
      {rotulo}
    </Link>
  ) : (
    <span title={titulo} className={classes}>
      {rotulo}
    </span>
  )
}
