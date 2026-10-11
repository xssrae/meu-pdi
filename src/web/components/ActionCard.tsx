import { CalendarDays, Check, ChevronLeft, Target } from 'lucide-react'
import { competencia } from '../../domain/framework'
import { progressoChecklist, proximoStatus, statusAnterior } from '../../domain/metrics'
import type { Acao } from '../../domain/types'
import { cn } from './cn'
import { StatusPill } from './StatusPill'
import { TOM_STATUS_ACAO } from './tones'
import { dataCurta } from '../format'

interface Props {
  acao: Pick<Acao, 'id' | 'titulo' | 'competenciaId' | 'prioridade' | 'prazo' | 'marcos' | 'status'> & { meta?: string | null }
  onMover?: (para: Acao['status']) => void
  /** Desabilita os botões enquanto a mudança é gravada. */
  ocupado?: boolean
}

/** Card do quadro Kanban: Avançar e Voltar como botões acessíveis por teclado. */
export function ActionCard({ acao, onMover, ocupado }: Props) {
  const marcos = progressoChecklist(acao.marcos)
  const prox = proximoStatus(acao.status)
  const ant = statusAnterior(acao.status)

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-card p-3.5 shadow-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="type-mono text-ink-3">{acao.id}</span>
        <StatusPill variante="prioridade" valor={acao.prioridade} />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 type-title">{acao.titulo}</h3>
        <span className="type-caption text-ink-3">{competencia(acao.competenciaId)?.nome ?? acao.competenciaId}</span>
      </div>

      {marcos.total > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between type-caption text-ink-2">
            <span>Marcos</span>
            <span className="type-mono">
              {marcos.feitos}/{marcos.total}
            </span>
          </div>
          <div className="h-1.5 rounded-sm bg-divider" role="img" aria-label={`Marcos: ${marcos.feitos} de ${marcos.total}`}>
            <div className="h-1.5 rounded-sm bg-accent" style={{ width: `${marcos.pct}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 type-caption text-ink-2">
        {acao.prazo && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            {dataCurta(acao.prazo)}
          </span>
        )}
        {acao.meta && (
          <span className="inline-flex items-center gap-1">
            <Target aria-hidden="true" className="size-3.5" />
            {acao.meta}
          </span>
        )}
      </div>

      {onMover && (
        <div className="flex items-center gap-2 border-t border-divider pt-3">
          {ant && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => onMover(ant)}
              aria-label={`Voltar ${acao.id} para ${TOM_STATUS_ACAO[ant].label}`}
              title={`Voltar para ${TOM_STATUS_ACAO[ant].label}`}
              className="inline-flex size-8 pointer-coarse:size-11 items-center justify-center rounded-sm border border-line-strong bg-card hover:bg-muted disabled:text-ink-3"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
          )}
          {prox ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => onMover(prox)}
              aria-label={`Mover ${acao.id} para ${TOM_STATUS_ACAO[prox].label}`}
              className={cn('inline-flex min-h-8 pointer-coarse:min-h-11 flex-1 items-center justify-center rounded-sm bg-soft px-3 type-small font-medium hover:bg-track disabled:text-ink-3')}
            >
              {TOM_STATUS_ACAO[prox].label}
            </button>
          ) : (
            <span className="inline-flex flex-1 items-center justify-center gap-1 type-small font-medium text-status-done-fg">
              <Check aria-hidden="true" className="size-4" />
              Concluída
            </span>
          )}
        </div>
      )}
    </article>
  )
}
