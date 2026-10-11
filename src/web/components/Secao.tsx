import { ChevronRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from './cn'

interface Props {
  titulo: ReactNode
  /** Link curto à direita do título (ex.: "Ver todas"). */
  link?: { to: string; rotulo: string }
  /** Conteúdo extra à direita do título (legenda, contador). */
  extra?: ReactNode
  className?: string
  children: ReactNode
}

/** Card de seção: título `h2`, link ou legenda à direita e conteúdo. */
export function Secao({ titulo, link, extra, className, children }: Props) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-card p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="m-0 type-h2">
          {titulo}
        </h2>
        {extra}
        {link && (
          <Link to={link.to} className="inline-flex min-h-8 items-center gap-1 type-small text-ink no-underline hover:text-accent">
            {link.rotulo}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
