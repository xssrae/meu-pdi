import { cn } from '../cn'

export interface Segmento {
  valor: number
  rotulo: string
  /** Classe de fundo da série (`bg-chart-*`). */
  cor: string
}

/** Barra empilhada com 2 px entre segmentos. Segmentos zerados não aparecem. */
export function SegmentBar({ segmentos, rotulo, className }: { segmentos: readonly Segmento[]; rotulo: string; className?: string }) {
  const visiveis = segmentos.filter((s) => s.valor > 0)
  const descricao = `${rotulo}: ${segmentos.map((s) => `${s.rotulo} ${s.valor}`).join(', ')}`
  return (
    <div role="img" aria-label={descricao} className={cn('flex h-3 gap-0.5', className)}>
      {visiveis.length ? (
        visiveis.map((s) => <span key={s.rotulo} title={`${s.rotulo}: ${s.valor}`} style={{ flex: `${s.valor} 1 0` }} className={cn('rounded-2xs', s.cor)} />)
      ) : (
        <span className="flex-1 rounded-2xs bg-divider" />
      )}
    </div>
  )
}
