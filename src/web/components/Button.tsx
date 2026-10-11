import type { ComponentProps, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from './cn'

export type VarianteBotao = 'primario' | 'secundario' | 'suave'

// Altura 40 px; 44 px em toque. Um primário por tela, no topo à direita.
const BASE =
  'inline-flex items-center justify-center gap-2 min-h-10 pointer-coarse:min-h-11 rounded-md type-body font-medium no-underline transition-colors disabled:cursor-not-allowed'

const VARIANTE: Record<VarianteBotao, string> = {
  primario: 'px-4 bg-ink text-on-ink hover:bg-ink-hover disabled:bg-disabled disabled:text-ink-3',
  secundario: 'px-3.5 bg-card text-ink border border-line-strong hover:bg-muted disabled:text-ink-3',
  suave: 'px-3 bg-soft text-ink type-small font-medium hover:bg-track disabled:text-ink-3',
}

interface Comum {
  variante?: VarianteBotao
  icone?: ReactNode
}

export function Button({ variante = 'secundario', icone, className, children, type = 'button', ...props }: Comum & ComponentProps<'button'>) {
  return (
    <button type={type} className={cn(BASE, VARIANTE[variante], className)} {...props}>
      {icone}
      {children}
    </button>
  )
}

export function ButtonLink({ variante = 'secundario', icone, className, children, ...props }: Comum & LinkProps) {
  return (
    <Link className={cn(BASE, VARIANTE[variante], className)} {...props}>
      {icone}
      {children}
    </Link>
  )
}

/** Botão só com ícone: `rotulo` vira `aria-label` e tooltip nativo. */
export function IconButton({ rotulo, className, children, type = 'button', ...props }: { rotulo: string } & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        'inline-flex size-10 pointer-coarse:size-11 items-center justify-center rounded-md border border-line-strong bg-card text-ink hover:bg-muted disabled:text-ink-3',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
