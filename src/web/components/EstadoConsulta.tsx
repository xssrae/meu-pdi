import type { ReactNode } from 'react'
import type { ArquivoComErro } from '../../domain/types'

/** Estados de carregamento e erro de uma consulta ao vault. */
export function EstadoConsulta({ carregando, erro }: { carregando: boolean; erro: Error | null }) {
  if (erro) {
    return (
      <p role="alert" className="m-0 type-body text-meta-atrasada-fg">
        Não foi possível ler o PDI: {erro.message}
      </p>
    )
  }
  if (carregando) return <p className="m-0 type-body text-ink-3">Lendo o vault…</p>
  return null
}

/** Quadro vazio com borda tracejada. */
export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border-[1.5px] border-dashed border-line-strong p-5 text-center type-small text-ink-3">{children}</div>
}

/** Aviso de notas ignoradas por erro de leitura. */
export function AvisoArquivos({ erros }: { erros: readonly ArquivoComErro[] }) {
  if (!erros.length) return null
  return (
    <p role="note" className="m-0 rounded-md border border-meta-risco-bg bg-card px-3 py-2 type-small text-ink-2">
      {erros.length === 1 ? '1 nota foi ignorada' : `${erros.length} notas foram ignoradas`} por erro de leitura:{' '}
      <span className="type-mono">{erros.map((e) => e.arquivo).join(', ')}</span>. Detalhes na Visão geral.
    </p>
  )
}
