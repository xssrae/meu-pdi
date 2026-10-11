import { cn } from '../cn'

/** Legenda de séries: quadrado da cor + rótulo. */
export function Legenda({ itens, className }: { itens: readonly { rotulo: string; cor: string }[]; className?: string }) {
  return (
    <ul className={cn('m-0 flex list-none flex-wrap gap-3 p-0 type-caption text-ink-2', className)}>
      {itens.map((i) => (
        <li key={i.rotulo} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', i.cor)} />
          {i.rotulo}
        </li>
      ))}
    </ul>
  )
}
