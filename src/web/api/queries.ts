// Hooks do TanStack Query. `refetchOnWindowFocus` (padrão) atualiza o painel
// ao voltar para a janela, inclusive depois de um agente gravar pelo MCP. As
// listas vêm inteiras (dezenas de itens) e os filtros das telas são aplicados
// no cliente. As escritas ficam em `mutacoes.ts`.

import { QueryClient, useQuery } from '@tanstack/react-query'
import type { DataISO } from '../../domain/types'
import { api, json } from './client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1 },
  },
})

export const chaves = {
  resumo: ['resumo'] as const,
  ciclo: ['ciclo'] as const,
  trilhas: ['trilhas'] as const,
  acoes: ['acoes'] as const,
  metas: ['metas'] as const,
  reunioes: ['reunioes'] as const,
  feedbacks: ['feedbacks'] as const,
  projetos: ['projetos'] as const,
  agenda: (de: DataISO, ate: DataISO) => ['agenda', de, ate] as const,
}

export function useResumo() {
  return useQuery({ queryKey: chaves.resumo, queryFn: () => json(api.resumo.$get()) })
}

export function useCiclo() {
  return useQuery({ queryKey: chaves.ciclo, queryFn: () => json(api.ciclo.$get()) })
}

export function useTrilhas() {
  return useQuery({ queryKey: chaves.trilhas, queryFn: () => json(api.trilhas.$get()) })
}

export function useAcoes() {
  return useQuery({ queryKey: chaves.acoes, queryFn: () => json(api.acoes.$get({ query: {} })) })
}

export function useMetas() {
  return useQuery({ queryKey: chaves.metas, queryFn: () => json(api.metas.$get()) })
}

export function useReunioes() {
  return useQuery({ queryKey: chaves.reunioes, queryFn: () => json(api.reunioes.$get()) })
}

export function useFeedbacks() {
  return useQuery({ queryKey: chaves.feedbacks, queryFn: () => json(api.feedbacks.$get({ query: {} })) })
}

export function useProjetos() {
  return useQuery({ queryKey: chaves.projetos, queryFn: () => json(api.projetos.$get()) })
}

export function useAgenda(de: DataISO, ate: DataISO) {
  return useQuery({
    queryKey: chaves.agenda(de, ate),
    queryFn: () => json(api.agenda.$get({ query: { de, ate } })),
    // Ao trocar de mês ou semana, mantém a grade anterior até a nova chegar.
    placeholderData: (anterior) => anterior,
  })
}
