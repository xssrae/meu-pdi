import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'

/**
 * Janela modal (Radix Dialog): foco preso, Esc fecha, título anunciado.
 * O conteúdo decide a estrutura; use `CorpoDialogo` e `RodapeDialogo`.
 */
export function Dialogo({
  aberto,
  onAbertoChange,
  titulo,
  descricao,
  children,
}: {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  titulo: string
  descricao?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={onAbertoChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          // Sem descrição, o Radix pede `aria-describedby` explícito e vazio.
          {...(!descricao && { 'aria-describedby': undefined })}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-card text-ink shadow-2 outline-none"
        >
          <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Dialog.Title className="m-0 type-h2">{titulo}</Dialog.Title>
              {descricao && <Dialog.Description className="m-0 type-small text-ink-2">{descricao}</Dialog.Description>}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              title="Fechar"
              className="inline-flex size-9 pointer-coarse:size-11 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-muted"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function CorpoDialogo({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>
}

export function RodapeDialogo({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider px-5 py-3.5">{children}</div>
}
