// Filtros e seleção na URL (Architecture §6): a visão é compartilhável e
// sobrevive ao reload. Valor igual ao padrão sai da URL.

import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** Lê os parâmetros da URL e devolve um setter que altera só as chaves passadas. */
export function useParametros() {
  const [params, setParams] = useSearchParams()

  const alterar = useCallback(
    (mudancas: Record<string, string | null | undefined>) =>
      setParams(
        (atual) => {
          const novo = new URLSearchParams(atual)
          for (const [k, v] of Object.entries(mudancas)) {
            if (v == null || v === '') novo.delete(k)
            else novo.set(k, v)
          }
          return novo
        },
        { replace: true },
      ),
    [setParams],
  )

  return [params, alterar] as const
}

/** Valor do parâmetro se estiver entre os permitidos; senão o padrão. */
export function escolha<V extends string>(valor: string | null, permitidos: readonly V[], padrao: V): V {
  return valor && (permitidos as readonly string[]).includes(valor) ? (valor as V) : padrao
}
