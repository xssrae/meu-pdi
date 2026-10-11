import { Link } from 'react-router'
import { cn } from './cn'

export type TomApoio = 'neutro' | 'alerta' | 'positivo'

const APOIO: Record<TomApoio, string> = {
  neutro: 'text-ink-2',
  alerta: 'text-meta-atrasada-fg',
  positivo: 'text-status-done-fg',
}

interface Props {
  numero: string
  rotulo: string
  valor: number | string
  de?: string
  apoio?: string
  tomApoio?: TomApoio
  /** Tela de origem do número. */
  to?: string
}

/** Célula de indicador: número, rótulo e linha de apoio em mono; leva à tela de origem. */
export function KpiCell({ numero, rotulo, valor, de, apoio, tomApoio = 'neutro', to }: Props) {
  const conteudo = (
    <>
      <span className="flex items-center gap-2 type-small text-ink-2">
        <span aria-hidden="true" className="inline-flex size-6 items-center justify-center rounded-xs bg-ink type-micro font-mono text-on-ink">
          {numero}
        </span>
        {rotulo}
      </span>
      <span className="type-kpi">
        {valor} {de && <span className="type-body font-medium text-ink-3">{de}</span>}
      </span>
      {apoio && <span className={cn('type-mono', APOIO[tomApoio])}>{apoio}</span>}
    </>
  )
  const base = 'flex flex-col gap-3 border-r border-b border-divider px-5 py-4.5 text-ink no-underline'
  return to ? (
    <Link to={to} className={cn(base, 'hover:bg-panel')}>
      {conteudo}
    </Link>
  ) : (
    <div className={base}>{conteudo}</div>
  )
}
