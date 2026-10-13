import type { ReactNode } from 'react'

/** Estados de carregamento e erro de uma consulta à API local. */
export function EstadoConsulta({ carregando, erro }: { carregando: boolean; erro: Error | null }) {
  if (erro) {
    return (
      <p role="alert" className="m-0 type-body text-meta-atrasada-fg">
        Não foi possível ler o PDI: {erro.message}
      </p>
    )
  }
  if (carregando) return <p className="m-0 type-body text-ink-3">Carregando…</p>
  return null
}

/** Quadro vazio com borda tracejada. */
export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border-[1.5px] border-dashed border-line-strong p-5 text-center type-small text-ink-3">{children}</div>
}
