import type { ReactNode } from 'react'

/** Moldura do painel: fundo, shell arredondado, barra lateral e área principal. */
export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ground p-2 sm:p-4">
      <div className="mx-auto flex max-w-[1440px] flex-wrap overflow-hidden rounded-2xl border border-line-strong bg-shell">
        <div className="flex-[1_1_248px] border-line-subtle md:border-r">{sidebar}</div>
        <main className="flex min-w-0 flex-[999_1_560px] flex-col">{children}</main>
      </div>
    </div>
  )
}

/** Painel claro onde fica o conteúdo da tela. */
export function Painel({ children }: { children: ReactNode }) {
  return <div className="m-2 flex flex-col gap-6 rounded-xl border border-line bg-panel p-4 sm:m-3 sm:p-7">{children}</div>
}
