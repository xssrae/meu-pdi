import { cn } from '../cn'

export interface FatiaDonut {
  valor: number
  rotulo: string
  /** Classe de traço da série (`stroke-chart-*`). */
  traco: string
}

const R = 52
const C = 2 * Math.PI * R
const VAO = 2

/** Rosca de séries com total no centro. O rótulo acessível lista todos os valores. */
export function Donut({ fatias, rotuloTotal, titulo, tamanho = 160 }: { fatias: readonly FatiaDonut[]; rotuloTotal: string; titulo: string; tamanho?: number }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0)
  const comprimentos = fatias.map((f) => (total ? (f.valor / total) * C : 0))
  const arcos = fatias.map((f, i) => {
    const len = comprimentos[i]!
    const inicio = comprimentos.slice(0, i).reduce((s, l) => s + l, 0)
    const visivel = Math.max(len - (f.valor > 0 && f.valor < total ? VAO : 0), 0)
    return { ...f, dash: `${visivel.toFixed(2)} ${(C - visivel).toFixed(2)}`, offset: (-inicio).toFixed(2) }
  })

  return (
    <div className="relative" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 140 140" role="img" aria-label={`${titulo}: ${fatias.map((f) => `${f.rotulo} ${f.valor}`).join(', ')}`}>
        <circle cx="70" cy="70" r={R} fill="none" strokeWidth="16" className="stroke-divider" />
        <g transform="rotate(-90 70 70)">
          {arcos
            .filter((a) => a.valor > 0)
            .map((a) => (
              <circle key={a.rotulo} cx="70" cy="70" r={R} fill="none" strokeWidth="16" strokeDasharray={a.dash} strokeDashoffset={a.offset} className={cn(a.traco)}>
                <title>{`${a.rotulo}: ${a.valor}`}</title>
              </circle>
            ))}
        </g>
      </svg>
      <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="type-kpi">{total}</span>
        <span className="type-caption text-ink-3">{rotuloTotal}</span>
      </div>
    </div>
  )
}
