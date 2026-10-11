import { ToggleGroup } from 'radix-ui'
import { cn } from './cn'

export interface OpcaoFiltro<V extends string> {
  valor: V
  label: string
  /** Quantidade de itens com esse filtro, em mono ao lado do rótulo. */
  contagem?: number
  /** Classe do ponto de cor antes do rótulo (ex.: tipo de feedback). */
  ponto?: string
}

/** Chips de filtro de escolha única (ToggleGroup do Radix). Ativo em tinta, inativo com contorno. */
export function FilterChips<V extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  className,
}: {
  rotulo: string
  opcoes: readonly OpcaoFiltro<V>[]
  valor: V
  onChange: (v: V) => void
  className?: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={rotulo}
      value={valor}
      // Radix devolve "" ao desmarcar o item ativo; o filtro sempre tem um valor.
      onValueChange={(v) => v && onChange(v as V)}
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {opcoes.map((o) => (
        <ToggleGroup.Item
          key={o.valor}
          value={o.valor}
          className={cn(
            'inline-flex min-h-8 pointer-coarse:min-h-11 items-center gap-1.5 rounded-full px-3 type-small',
            'border border-line-strong bg-card text-ink hover:bg-muted',
            'data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-on-ink',
          )}
        >
          {o.ponto && <span aria-hidden="true" className={cn('size-2 rounded-full', o.ponto)} />}
          {o.label}
          {o.contagem != null && <span className="type-micro font-mono opacity-75">{o.contagem}</span>}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
