import { Plus, Trash2 } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'
import type { ItemChecklist } from '../../domain/types'
import { Button } from './Button'
import { cn } from './cn'

/** Aparência comum de input, select e textarea (40 px; 44 px em toque). */
export const CLASSE_CAMPO =
  'min-h-10 pointer-coarse:min-h-11 w-full min-w-0 rounded-md border border-line-strong bg-card px-3 type-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ink disabled:bg-muted disabled:text-ink-3'

/** Rótulo em cima do controle; `dica` explica o formato ou o efeito. */
export function Campo({ rotulo, opcional, dica, children, className }: { rotulo: string; opcional?: boolean; dica?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="type-small font-medium">
        {rotulo}
        {opcional && <span className="font-normal text-ink-3"> (opcional)</span>}
      </span>
      {children}
      {dica && <span className="type-caption text-ink-3">{dica}</span>}
    </label>
  )
}

/** Dois ou três campos lado a lado, empilhados no celular. */
export function Linha({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3">{children}</div>
}

/** Grupo de caixas de marcação (seleção múltipla). */
export function Marcacoes<T extends string>({
  legenda,
  opcoes,
  valores,
  onChange,
  dica,
}: {
  legenda: string
  opcoes: readonly { valor: T; label: ReactNode }[]
  valores: readonly T[]
  onChange: (v: T[]) => void
  dica?: string
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 type-small font-medium">{legenda}</legend>
      {opcoes.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-x-3 gap-y-1">
          {opcoes.map((o) => (
            <label key={o.valor} className="flex min-h-9 pointer-coarse:min-h-11 items-center gap-2 rounded-sm px-1 type-small hover:bg-muted">
              <input
                type="checkbox"
                className="size-4 accent-ink"
                checked={valores.includes(o.valor)}
                onChange={(e) => onChange(e.target.checked ? [...valores, o.valor] : valores.filter((v) => v !== o.valor))}
              />
              <span className="min-w-0">{o.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="m-0 type-small text-ink-3">Nenhuma opção disponível.</p>
      )}
      {dica && <span className="type-caption text-ink-3">{dica}</span>}
    </fieldset>
  )
}

/** Lista editável de itens com caixa de "feito" (marcos de uma ação, pauta da 1:1). */
export function EditorChecklist({ legenda, itens, onChange, rotuloItem }: { legenda: string; itens: ItemChecklist[]; onChange: (i: ItemChecklist[]) => void; rotuloItem: string }) {
  const id = useId()
  // Depois de "Adicionar", o foco vai para o campo novo (e não fica no botão).
  const focarNovo = useRef(false)
  const alterar = (i: number, parcial: Partial<ItemChecklist>) => onChange(itens.map((x, j) => (j === i ? { ...x, ...parcial } : x)))
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-1.5 p-0 type-small font-medium">{legenda}</legend>
      {itens.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label={`${rotuloItem} ${i + 1} feito`}
            className="size-4 shrink-0 accent-ink"
            checked={item.feito}
            onChange={(e) => alterar(i, { feito: e.target.checked })}
          />
          <input
            id={`${id}-${i}`}
            ref={(el) => {
              if (el && focarNovo.current && i === itens.length - 1) {
                focarNovo.current = false
                el.focus()
              }
            }}
            aria-label={`${rotuloItem} ${i + 1}`}
            className={cn(CLASSE_CAMPO, item.feito && 'text-ink-2 line-through')}
            value={item.texto}
            onChange={(e) => alterar(i, { texto: e.target.value })}
          />
          <button
            type="button"
            aria-label={`Remover ${rotuloItem.toLowerCase()} ${i + 1}`}
            title="Remover"
            onClick={() => onChange(itens.filter((_, j) => j !== i))}
            className="inline-flex size-10 pointer-coarse:size-11 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-muted hover:text-ink"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
      <Button variante="suave" className="self-start" icone={<Plus aria-hidden="true" className="size-4" />} onClick={() => {
          focarNovo.current = true
          onChange([...itens, { texto: '', feito: false }])
        }}>
        Adicionar {rotuloItem.toLowerCase()}
      </Button>
    </fieldset>
  )
}
