import { Tabs } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface Aba<V extends string> {
  valor: V
  label: string
  /** Quantidade de itens da aba, em mono ao lado do rótulo. */
  contagem?: number
  conteudo?: ReactNode
}

/** Abas segmentadas (Tabs do Radix): trilho neutro, aba ativa em card com sombra. Só a aba ativa monta o painel. */
export function SegmentedTabs<V extends string>({
  rotulo,
  abas,
  valor,
  onChange,
  className,
  children,
}: {
  rotulo: string
  abas: readonly Aba<V>[]
  valor: V
  onChange: (v: V) => void
  className?: string
  /** Conteúdo comum a todas as abas (ex.: a tabela filtrada). Cada aba pode ter o seu em `conteudo`. */
  children?: ReactNode
}) {
  return (
    <Tabs.Root value={valor} onValueChange={(v) => onChange(v as V)} className={className}>
      <Tabs.List aria-label={rotulo} className="inline-flex flex-wrap gap-1 rounded-lg bg-track p-1">
        {abas.map((a) => (
          <Tabs.Trigger
            key={a.valor}
            value={a.valor}
            className={cn(
              'min-h-8 pointer-coarse:min-h-11 rounded-sm px-3 type-small text-ink-2 hover:text-ink',
              'data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-ink data-[state=active]:shadow-tab',
            )}
          >
            {a.label}
            {a.contagem != null && <span className="ml-1.5 type-micro font-mono font-normal text-ink-3">{a.contagem}</span>}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {/* Toda aba tem painel: o aria-controls do gatilho precisa apontar para um elemento existente. */}
      {abas.map((a) => (
        <Tabs.Content key={a.valor} value={a.valor} className="pt-4">
          {a.conteudo ?? children}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
