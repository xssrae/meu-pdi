// Proteções de um servidor local (Architecture §5):
// - Host fixo bloqueia DNS rebinding;
// - Origin de outro site é recusado, o que impede páginas da web de chamar o localhost;
// - escritas exigem Origin do próprio app e JSON (Fase 4 usa isto).

import type { MiddlewareHandler } from 'hono'

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function protecaoLocal(opts: { hosts: string[]; origens: string[] }): MiddlewareHandler {
  const hosts = new Set(opts.hosts.map((h) => h.toLowerCase()))
  const origens = new Set(opts.origens.map((o) => o.toLowerCase()))

  return async (c, next) => {
    const host = c.req.header('host')?.toLowerCase()
    if (!host || !hosts.has(host)) return c.json({ erro: 'Host não permitido' }, 403)

    const origin = c.req.header('origin')?.toLowerCase()
    if (origin && !origens.has(origin)) return c.json({ erro: 'Origem não permitida' }, 403)

    if (!METODOS_SEGUROS.has(c.req.method)) {
      if (!origin) return c.json({ erro: 'Origem obrigatória para escrita' }, 403)
      if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) {
        return c.json({ erro: 'Content-Type deve ser application/json' }, 415)
      }
    }

    await next()
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Cache-Control', 'no-store')
  }
}
