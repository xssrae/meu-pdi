import { cn } from '../cn'

/** Progresso da meta (sálvia) com um traço no tempo decorrido do prazo. */
export function ProgressTime({ progresso, tempo, className }: { progresso: number; tempo: number; className?: string }) {
  const p = Math.min(100, Math.max(0, progresso))
  const t = Math.min(100, Math.max(0, tempo))
  return (
    <div role="img" aria-label={`Progresso ${p}%, ${t}% do prazo decorrido`} className={cn('relative h-2 rounded-sm bg-divider', className)}>
      <div className="h-2 rounded-sm bg-accent" style={{ width: `${p}%` }} />
      <span aria-hidden="true" className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 bg-ink" style={{ left: `${t}%` }} />
    </div>
  )
}
