import { useId, type ReactNode } from 'react'
import type { Reuniao } from '../../../domain/types'
import { capitalizar, dataCurta, diaDaSemana, diaPorExtenso, emDias, mesEDia } from '../../format'

interface Props {
  reuniao: Pick<Reuniao, 'data' | 'inicio' | 'fim' | 'tema'>
  dias: number
  /** `compacto` mostra o bloco de data ao lado do horário (Visão geral). */
  variante?: 'compacto' | 'completo'
  resumo?: ReactNode
  children?: ReactNode
}

/** Card escuro da próxima 1:1: data, horário e o conteúdo da pauta. */
export function CardProximaReuniao({ reuniao, dias, variante = 'completo', resumo, children }: Props) {
  const id = useId()
  const { mes, dia } = mesEDia(reuniao.data)
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5 rounded-xl bg-ink p-5 text-on-ink">
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="m-0 type-small font-normal text-on-ink-2">
          Próxima 1:1
        </h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 type-caption">{emDias(dias)}</span>
      </div>
      {variante === 'compacto' ? (
        <div className="flex items-center gap-3.5">
          <div aria-hidden="true" className="flex h-15 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-card text-ink">
            <span className="type-micro text-ink-3 uppercase">{mes}</span>
            <span className="text-[22px] leading-none font-bold">{dia}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] leading-snug font-semibold">
              {/* A data visível está no bloco ao lado, que é decorativo para o leitor de tela. */}
              {capitalizar(diaDaSemana(reuniao.data))}, <span className="sr-only">{dataCurta(reuniao.data)}, </span>
              {reuniao.inicio}–{reuniao.fim}
            </span>
            {resumo && <span className="type-small text-on-ink-2">{resumo}</span>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="text-[20px] leading-tight font-semibold">{diaPorExtenso(reuniao.data)}</span>
          <span className="type-small text-on-ink-2">
            {reuniao.inicio}–{reuniao.fim}
            {reuniao.tema ? ` · ${reuniao.tema}` : ''}
          </span>
          {resumo && <span className="type-small text-on-ink-2">{resumo}</span>}
        </div>
      )}
      {children}
    </section>
  )
}
