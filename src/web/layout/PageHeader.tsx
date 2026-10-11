import type { ReactNode } from 'react'

/** Cabeçalho da tela: navegação estrutural à esquerda; ações (um único primário) à direita. */
export function PageHeader({ trilha, children }: { trilha: string[]; children?: ReactNode }) {
  return (
    // Altura mínima de um botão (40 px) + respiro: o cabeçalho não muda de altura entre telas com e sem ações.
    <header className="flex min-h-[69px] flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-3.5">
      <nav aria-label="Navegação estrutural" className="type-body text-ink-3">
        <ol className="m-0 flex list-none items-center gap-2 p-0">
          {trilha.map((t, i) => {
            const ultimo = i === trilha.length - 1
            return (
              <li key={t} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                <span aria-current={ultimo ? 'page' : undefined} className={ultimo ? 'font-medium text-ink' : undefined}>
                  {t}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

/** Título e subtítulo da tela. */
export function TituloTela({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 type-h1">{titulo}</h1>
        {subtitulo && <p className="m-0 type-body text-ink-2">{subtitulo}</p>}
      </div>
      {children}
    </div>
  )
}
