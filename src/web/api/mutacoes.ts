// Escritas do painel: POST, PATCH e DELETE em `/api/<entidade>`, as mesmas
// regras que o MCP usa (ADR-007). Depois de qualquer escrita, todas as
// consultas são invalidadas: as telas cruzam entidades (resumo, agenda…).

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Entidade, TipoDe } from '../../server/servicos'
import { ErroApi } from './client'

export type { Entidade }

export type Operacao =
  | { op: 'criar'; entidade: Entidade; dados: object }
  | { op: 'atualizar'; entidade: Entidade; chave: string; versao: number; patch: object }
  | { op: 'excluir'; entidade: Entidade; chave: string; versao: number }

const METODO = { criar: 'POST', atualizar: 'PATCH', excluir: 'DELETE' } as const

export async function executar(o: Operacao): Promise<TipoDe[Entidade] | null> {
  const url = o.op === 'criar' ? `/api/${o.entidade}` : `/api/${o.entidade}/${encodeURIComponent(o.chave)}`
  const r = await fetch(url, {
    method: METODO[o.op],
    headers: { 'content-type': 'application/json', ...(o.op !== 'criar' && { 'if-match': `"${o.versao}"` }) },
    body: o.op === 'criar' ? JSON.stringify(o.dados) : o.op === 'atualizar' ? JSON.stringify(o.patch) : undefined,
  })
  if (!r.ok) {
    const corpo = (await r.json().catch(() => null)) as { erro?: string } | null
    throw new ErroApi(r.status, corpo?.erro ?? `Erro ${r.status} ao gravar no servidor local`)
  }
  return r.status === 204 ? null : ((await r.json()) as TipoDe[Entidade])
}

export function useEscrita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: executar,
    onSettled: () => qc.invalidateQueries(),
  })
}
