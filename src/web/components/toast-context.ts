import { createContext, useContext } from 'react'

export type TipoToast = 'sucesso' | 'erro'
export type Avisar = (texto: string, tipo?: TipoToast) => void

export const ContextoToast = createContext<Avisar | null>(null)

/** Mostra um toast: `avisar('PDI-02 movida para Concluído')` ou `avisar('Falhou', 'erro')`. */
export function useToast(): Avisar {
  const ctx = useContext(ContextoToast)
  if (!ctx) throw new Error('useToast precisa de <ToastProvider>')
  return ctx
}
