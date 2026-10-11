import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Evento, MetaVista, Resumo } from '../domain/aggregates'
import { comTratamentoDeErros, criarApi } from './app'
import { VaultRepository } from './vault-repository'
import { Hono } from 'hono'

const HOST = '127.0.0.1:5174'
const app = comTratamentoDeErros(
  new Hono().route(
    '/',
    criarApi({
      repo: new VaultRepository(path.resolve('fixtures/vault/PDI')),
      hostsPermitidos: [HOST, 'localhost:5174'],
      origensPermitidas: [`http://${HOST}`],
      hoje: () => '2026-10-11',
    }),
  ),
)

function get(rota: string, headers: Record<string, string> = {}) {
  return app.request(rota, { headers: { host: HOST, ...headers } })
}

describe('proteção local', () => {
  it('recusa Host desconhecido (DNS rebinding)', async () => {
    const r = await app.request('/api/saude', { headers: { host: 'evil.example:5174' } })
    expect(r.status).toBe(403)
  })

  it('recusa Origin de outro site', async () => {
    expect((await get('/api/saude', { origin: 'https://evil.example' })).status).toBe(403)
    expect((await get('/api/saude', { origin: `http://${HOST}` })).status).toBe(200)
  })

  it('exige Origin e JSON em escritas', async () => {
    const semOrigin = await app.request('/api/acoes', { method: 'POST', headers: { host: HOST, 'content-type': 'application/json' }, body: '{}' })
    expect(semOrigin.status).toBe(403)
    const texto = await app.request('/api/acoes', { method: 'POST', headers: { host: HOST, origin: `http://${HOST}`, 'content-type': 'text/plain' }, body: 'x' })
    expect(texto.status).toBe(415)
  })

  it('marca respostas como nosniff e sem cache', async () => {
    const r = await get('/api/saude')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('cache-control')).toBe('no-store')
  })
})

describe('rotas de leitura', () => {
  it('filtra ações por trilha e informa a meta derivada', async () => {
    const { itens } = (await (await get('/api/acoes?trilha=T1')).json()) as { itens: { id: string; meta: string | null; progresso: number }[] }
    expect(itens.map((a) => a.id)).toEqual(['PDI-01', 'PDI-02', 'PDI-03', 'PDI-04'])
    expect(itens.find((a) => a.id === 'PDI-02')).toMatchObject({ meta: 'M-01', progresso: 67 })
  })

  it('valida parâmetros e IDs', async () => {
    expect((await get('/api/acoes?trilha=X')).status).toBe(400)
    expect((await get('/api/acoes/..%2F..%2Fetc')).status).toBe(400)
    expect((await get('/api/acoes/PDI-99')).status).toBe(404)
    expect((await get('/api/agenda?de=2026-10-31&ate=2026-10-01')).status).toBe(400)
    expect((await get('/api/inexistente')).status).toBe(404)
  })

  it('calcula o estado das metas como no design aprovado', async () => {
    const { itens } = (await (await get('/api/metas')).json()) as { itens: MetaVista[] }
    const estado = Object.fromEntries(itens.map((m) => [m.id, [m.estado, m.progresso]]))
    expect(estado).toEqual({
      'M-01': ['no-ritmo', 67],
      'M-02': ['em-risco', 0],
      'M-03': ['no-ritmo', 50],
      'M-04': ['no-ritmo', 33],
      'M-05': ['atrasada', 40],
      'M-06': ['concluida', 100],
    })
  })

  it('monta o resumo da Visão geral', async () => {
    const r = (await (await get('/api/resumo')).json()) as Resumo & { erros: unknown[] }
    expect(r.erros).toEqual([])
    expect(r.kpis).toEqual({
      acoes: { concluidas: 5, total: 15, pct: 33 },
      metas: { ativas: 5, total: 6, atrasadas: 1 },
      competencias: { naMeta: 7, total: 18, nivelAlvo: 'pleno' },
      feedbacks: { total: 7, reunioes: 3, viraramMeta: 3 },
    })
    expect(r.trilhas.map((t) => [t.trilha, t.concluidas, t.total])).toEqual([
      ['T1', 1, 4],
      ['T2', 1, 3],
      ['T3', 1, 2],
      ['T4', 1, 3],
      ['T5', 1, 3],
    ])
    expect(r.proximaReuniao).toMatchObject({ data: '2026-10-15', emDias: 4 })
    expect(r.proximaReuniao?.metasParaRevisar[0]?.id).toBe('M-05')
    expect(r.prazos.map((p) => p.id)).toEqual(['M-05', 'PDI-11', 'M-02', 'PDI-05', 'M-01'])
    expect(r.barraLateral).toEqual({ metasAtrasadas: 1, proximaReuniao: '2026-10-15' })
  })

  it('agrega a agenda da semana com 1:1, véspera, prazos e blocos', async () => {
    const { eventos } = (await (await get('/api/agenda?de=2026-10-12&ate=2026-10-18')).json()) as { eventos: Evento[] }
    expect(eventos.map((e) => [e.tipo, e.data, e.ref])).toEqual([
      ['bloco', '2026-10-13', 'estudo-aws'],
      ['preparar-pauta', '2026-10-14', '2026-10-15'],
      ['reuniao', '2026-10-15', '2026-10-15'],
    ])
    expect(eventos[0]?.trilha).toBe('T5')
  })
})
