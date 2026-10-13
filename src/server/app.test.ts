import { Hono } from 'hono'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Evento, MetaVista, Resumo } from '../domain/aggregates'
import { comTratamentoDeErros, criarApi, ROTA_ENTIDADE, versaoDe } from './app'
import { bancoDeTeste } from './db/teste'
import { ENTIDADES, Servicos } from './servicos'

const HOST = '127.0.0.1:5174'
const ORIGEM = `http://${HOST}`
let app: Hono

beforeEach(() => {
  app = comTratamentoDeErros(
    new Hono().route(
      '/',
      criarApi({
        servicos: new Servicos(bancoDeTeste(), { hoje: () => '2026-10-11' }),
        hostsPermitidos: [HOST, 'localhost:5174'],
        origensPermitidas: [ORIGEM],
        hoje: () => '2026-10-11',
      }),
    ),
  )
})

function get(rota: string, headers: Record<string, string> = {}) {
  return app.request(rota, { headers: { host: HOST, ...headers } })
}

function enviar(metodo: 'POST' | 'PATCH' | 'DELETE', rota: string, corpo?: unknown, versao?: number) {
  return app.request(rota, {
    method: metodo,
    headers: { host: HOST, origin: ORIGEM, 'content-type': 'application/json', ...(versao !== undefined && { 'if-match': `"${versao}"` }) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
}

describe('proteção local', () => {
  it('recusa Host desconhecido (DNS rebinding)', async () => {
    const r = await app.request('/api/saude', { headers: { host: 'evil.example:5174' } })
    expect(r.status).toBe(403)
  })

  it('recusa Origin de outro site', async () => {
    expect((await get('/api/saude', { origin: 'https://evil.example' })).status).toBe(403)
    expect((await get('/api/saude', { origin: ORIGEM })).status).toBe(200)
  })

  it('exige Origin e JSON em escritas', async () => {
    const semOrigin = await app.request('/api/acoes', { method: 'POST', headers: { host: HOST, 'content-type': 'application/json' }, body: '{}' })
    expect(semOrigin.status).toBe(403)
    const texto = await app.request('/api/acoes', { method: 'POST', headers: { host: HOST, origin: ORIGEM, 'content-type': 'text/plain' }, body: 'x' })
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
    const r = (await (await get('/api/resumo')).json()) as Resumo
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

describe('rotas de escrita', () => {
  it('a rota literal cobre exatamente as entidades dos serviços', () => {
    expect(ROTA_ENTIDADE).toBe(`/:entidade{${ENTIDADES.join('|')}}`)
  })

  it('cria uma ação com o próximo ID e devolve 201 com ETag', async () => {
    const r = await enviar('POST', '/api/acoes', { titulo: 'Ler sobre filas', ciclo: '2026.2', trilha: 'T1', competenciaId: 'system-design' })
    expect(r.status).toBe(201)
    expect(r.headers.get('etag')).toBe('"1"')
    expect(await r.json()).toMatchObject({ id: 'PDI-16', status: 'nao-iniciado', prioridade: 'media', versao: 1 })
    expect((await get('/api/acoes/PDI-16')).status).toBe(200)
  })

  it('recusa dados inválidos com a mensagem do campo', async () => {
    const r = await enviar('POST', '/api/acoes', { titulo: '', ciclo: '2026.2', trilha: 'T9', competenciaId: 'telepatia' })
    expect(r.status).toBe(400)
    const { erro } = (await r.json()) as { erro: string }
    expect(erro).toContain('título é obrigatório')
    expect(erro).toContain('competência desconhecida: telepatia')
    expect((await enviar('POST', '/api/acoes', { titulo: 'X', ciclo: '2026.2', trilha: 'T9', competenciaId: 'ia' })).status).toBe(400)
    const corpoRuim = await app.request('/api/acoes', { method: 'POST', headers: { host: HOST, origin: ORIGEM, 'content-type': 'application/json' }, body: '{x' })
    expect(corpoRuim.status).toBe(400)
  })

  it('atualiza com If-Match e responde 409 a uma versão antiga', async () => {
    expect((await enviar('PATCH', '/api/acoes/PDI-01', { status: 'concluido' })).status).toBe(428)
    const ok = await enviar('PATCH', '/api/acoes/PDI-01', { status: 'concluido' }, 1)
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ id: 'PDI-01', status: 'concluido', versao: 2 })
    const velho = await enviar('PATCH', '/api/acoes/PDI-01', { status: 'em-revisao' }, 1)
    expect(velho.status).toBe(409)
    expect(await velho.json()).toMatchObject({ versaoAtual: 2 })
  })

  it('exclui, e recusa excluir o que deixaria órfãos', async () => {
    expect((await enviar('DELETE', '/api/trilhas/T1')).status).toBe(409)
    expect((await enviar('DELETE', '/api/acoes/PDI-15', undefined, 1)).status).toBe(204)
    expect((await get('/api/acoes/PDI-15')).status).toBe(404)
    expect((await enviar('DELETE', '/api/acoes/PDI-15')).status).toBe(404)
    expect((await enviar('DELETE', '/api/inexistente/X')).status).toBe(404)
  })
})

describe('If-Match', () => {
  it('aceita a versão com e sem aspas e recusa lixo', () => {
    expect(versaoDe('"3"')).toBe(3)
    expect(versaoDe('3')).toBe(3)
    expect(versaoDe('W/"3"')).toBe(3)
    expect(versaoDe(undefined)).toBeUndefined()
    expect(versaoDe('abc')).toBeNull()
  })
})
