// Cliente tipado da API (hono/client): os tipos vêm direto das rotas do servidor.

import { hc } from 'hono/client'
import type { AppType } from '../../server/app'

export const api = hc<AppType>('/').api

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

interface Resposta {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

/** Corpo das respostas de sucesso: descarta as variantes com `ok: false` (ex.: 400 do validador). */
type CorpoOk<R> = R extends { ok: false } ? never : R extends { json(): Promise<infer T> } ? T : never

/** Lê a resposta como JSON e transforma status de erro em exceção. */
export async function json<R extends Resposta>(resposta: Promise<R>): Promise<CorpoOk<R>> {
  const r = await resposta
  if (!r.ok) {
    const corpo = (await r.json().catch(() => null)) as { erro?: string } | null
    throw new ErroApi(r.status, corpo?.erro ?? `Erro ${r.status} ao falar com o servidor local`)
  }
  return (await r.json()) as CorpoOk<R>
}
