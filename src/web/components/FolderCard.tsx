import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from './cn'
import type { TomPasta } from './tones'

interface Props {
  tom: TomPasta
  children: ReactNode
  /** Altura da pasta em px (o design usa 92 na Visão geral e 110 nas telas de pastas). */
  altura?: number
  selecionada?: boolean
  rotulo?: string
  to?: string
  onClick?: () => void
  className?: string
}

/** Pasta: aba no tom 2 da cor, corpo no tom 1. Selecionada = anel de tinta. */
export function FolderCard({ tom, children, altura = 110, selecionada, rotulo, to, onClick, className }: Props) {
  const pasta = (
    <span aria-hidden={rotulo ? true : undefined} className="relative block w-full" style={{ height: altura }}>
      <span className={cn('absolute top-0 left-0 h-5 w-[46%] rounded-t-lg', tom.tab)} />
      <span
        className={cn(
          'absolute inset-x-0 top-3 bottom-0 box-border flex flex-col justify-end rounded-tl-2xs rounded-tr-xl rounded-br-xl rounded-bl-xl p-3',
          tom.bg,
          tom.fg,
          selecionada && 'ring-select',
        )}
      >
        {children}
      </span>
    </span>
  )

  const base = cn('block w-full rounded-xl text-left no-underline text-inherit', className)
  if (to) {
    return (
      <Link to={to} aria-label={rotulo} aria-current={selecionada ? 'page' : undefined} className={base}>
        {pasta}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" aria-label={rotulo} aria-pressed={selecionada} onClick={onClick} className={base}>
        {pasta}
      </button>
    )
  }
  return <div className={base}>{pasta}</div>
}
