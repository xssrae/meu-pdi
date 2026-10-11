import { ESCALA } from '../../domain/framework'
import type { Maturidade, Pilar } from '../../domain/types'
import { cn } from './cn'

interface Props {
  nome: string
  pilar: Pilar
  /** `null` = ainda sem autoavaliação. */
  nivel: Maturidade | null
  meta: Maturidade
  /** Com `onChange`, cada ponto vira um botão de autoavaliação. */
  onChange?: (nivel: Maturidade) => void
}

function classeDoPonto(i: number, nivel: number | null, meta: number) {
  if (nivel != null && i <= nivel) return 'bg-chart-done'
  if (i === meta) return 'border-[1.5px] border-chart-done'
  return 'bg-line-strong'
}

/** Pontos de maturidade: cheio = atual, contorno = meta, cinza = acima. */
export function LevelDots({ nome, pilar, nivel, meta, onChange }: Props) {
  const escala = ESCALA[pilar]
  const resumo = `${nome}: ${nivel ? `nível ${escala[nivel - 1]}` : 'sem autoavaliação'}, meta ${escala[meta - 1]}`
  const pontos = escala.map((rotulo, idx) => ({ i: (idx + 1) as Maturidade, rotulo }))

  if (!onChange) {
    return (
      <span role="img" aria-label={resumo} className="inline-flex items-center gap-1">
        {pontos.map(({ i }) => (
          <span key={i} className={cn('box-border size-2.5 rounded-full', classeDoPonto(i, nivel, meta))} />
        ))}
      </span>
    )
  }

  return (
    <span role="group" aria-label={resumo} className="inline-flex items-center">
      {pontos.map(({ i, rotulo }) => (
        <button
          key={i}
          type="button"
          aria-label={`Definir ${nome} como ${rotulo}`}
          aria-pressed={i === nivel}
          onClick={() => onChange(i)}
          className="inline-flex h-7 w-5.5 pointer-coarse:size-11 items-center justify-center rounded-xs hover:bg-muted"
        >
          <span className={cn('box-border size-2.5 rounded-full', classeDoPonto(i, nivel, meta))} />
        </button>
      ))}
    </span>
  )
}
