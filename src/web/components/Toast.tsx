import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { Toast as RadixToast } from 'radix-ui'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { cn } from './cn'
import { ContextoToast, type Avisar, type TipoToast } from './toast-context'


interface ItemToast {
  id: number
  texto: string
  tipo: TipoToast
}


/** Toast de confirmação e erro (Radix). Sucesso some sozinho; erro fica até ser fechado. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemToast[]>([])

  const avisar = useCallback<Avisar>((texto, tipo = 'sucesso') => {
    setItens((atual) => [...atual.slice(-2), { id: Date.now() + Math.random(), texto, tipo }])
  }, [])

  const remover = useCallback((id: number) => setItens((atual) => atual.filter((t) => t.id !== id)), [])
  const valor = useMemo(() => avisar, [avisar])

  return (
    <ContextoToast.Provider value={valor}>
      <RadixToast.Provider swipeDirection="right" label="Notificação">
        {children}
        {itens.map((t) => (
          <ToastItem key={t.id} {...t} onFechar={() => remover(t.id)} />
        ))}
        <RadixToast.Viewport className="fixed right-4 bottom-4 z-50 m-0 flex w-[min(380px,calc(100vw-32px))] list-none flex-col gap-2 p-0 outline-none" />
      </RadixToast.Provider>
    </ContextoToast.Provider>
  )
}

function classesToast(tipo: TipoToast) {
  return cn(
    'flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 py-2 type-small shadow-2',
    tipo === 'sucesso' ? 'border-toast-ok text-status-done-fg' : 'border-meta-atrasada-bg text-meta-atrasada-fg',
  )
}

const ICONE = { sucesso: CircleCheck, erro: CircleAlert } as const

/** Aparência do toast sem comportamento, para o catálogo `/_fundamentos`. */
export function ToastVisual({ texto, tipo }: { texto: string; tipo: TipoToast }) {
  const Icone = ICONE[tipo]
  return (
    <div className={classesToast(tipo)}>
      <Icone aria-hidden="true" className="size-4 shrink-0" />
      <span className="flex-1">{texto}</span>
    </div>
  )
}

function ToastItem({ texto, tipo, onFechar }: { texto: string; tipo: TipoToast; onFechar: () => void }) {
  const Icone = ICONE[tipo]
  return (
    <RadixToast.Root
      duration={tipo === 'sucesso' ? 2600 : Infinity}
      type={tipo === 'erro' ? 'foreground' : 'background'}
      onOpenChange={(aberto) => !aberto && onFechar()}
      className={classesToast(tipo)}
    >
      <Icone aria-hidden="true" className="size-4 shrink-0" />
      <RadixToast.Description className="flex-1">{texto}</RadixToast.Description>
      <RadixToast.Close aria-label="Fechar" className="inline-flex size-8 items-center justify-center rounded-sm text-ink-3 hover:bg-muted">
        <X aria-hidden="true" className="size-4" />
      </RadixToast.Close>
    </RadixToast.Root>
  )
}
