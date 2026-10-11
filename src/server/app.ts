// Rotas da API (Architecture §5). Encadeadas para que `hono/client`
// infira os tipos de ponta a ponta (`AppType`).

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { montarAgenda, montarResumo, vistaAcoes, vistaMetas } from '../domain/aggregates'
import { hojeISO, resumoTrilha } from '../domain/metrics'
import { RE_ACAO_ID, RE_DATA, RE_META_ID, filtroAcoes, filtroFeedbacks, intervaloAgenda } from '../domain/schemas'
import { protecaoLocal } from './seguranca'
import type { VaultRepository } from './vault-repository'

export interface OpcoesApp {
  repo: VaultRepository
  hostsPermitidos: string[]
  origensPermitidas: string[]
  /** Data de referência; injetável para testes. */
  hoje?: () => string
}

const naoEncontrado = (o: string) => ({ erro: `${o} não encontrado` })

export function criarApi(opts: OpcoesApp) {
  const { repo } = opts
  const hoje = opts.hoje ?? (() => hojeISO())

  return new Hono()
    .basePath('/api')
    .use(protecaoLocal({ hosts: opts.hostsPermitidos, origens: opts.origensPermitidas }))
    .get('/saude', (c) => c.json({ ok: true as const }))

    .get('/ciclo', async (c) => {
      const [ciclo, { erros }] = await Promise.all([repo.cicloAtual(hoje()), repo.ciclos()])
      return c.json({ ciclo, erros })
    })

    .get('/trilhas', async (c) => {
      const [trilhas, acoes] = await Promise.all([repo.trilhas(), repo.acoes()])
      const itens = [...trilhas.itens]
        .sort((a, b) => a.ordem - b.ordem)
        .map((t) => ({ ...t, resumo: resumoTrilha(t.id, acoes.itens) }))
      return c.json({ itens, erros: trilhas.erros })
    })
    .get('/trilhas/:id{T[0-9]+}', async (c) => {
      const [trilhas, acoes] = await Promise.all([repo.trilhas(), repo.acoes()])
      const t = trilhas.itens.find((x) => x.id === c.req.param('id'))
      if (!t) return c.json(naoEncontrado('Trilha'), 404)
      return c.json({ ...t, resumo: resumoTrilha(t.id, acoes.itens) }, 200)
    })

    .get('/acoes', zValidator('query', filtroAcoes), async (c) => {
      const { ciclo, trilha } = c.req.valid('query')
      const [acoes, metas] = await Promise.all([repo.acoes(), repo.metas()])
      const itens = vistaAcoes(acoes.itens, metas.itens).filter((a) => (!ciclo || a.ciclo === ciclo) && (!trilha || a.trilha === trilha))
      return c.json({ itens, erros: acoes.erros })
    })
    .get('/acoes/:id', async (c) => {
      const id = c.req.param('id')
      if (!RE_ACAO_ID.test(id)) return c.json({ erro: 'ID de ação inválido' }, 400)
      const [acoes, metas] = await Promise.all([repo.acoes(), repo.metas()])
      const a = vistaAcoes(acoes.itens, metas.itens).find((x) => x.id === id)
      return a ? c.json(a, 200) : c.json(naoEncontrado('Ação'), 404)
    })

    .get('/metas', async (c) => {
      const [metas, acoes] = await Promise.all([repo.metas(), repo.acoes()])
      return c.json({ itens: vistaMetas(metas.itens, acoes.itens, hoje()), erros: metas.erros })
    })
    .get('/metas/:id', async (c) => {
      const id = c.req.param('id')
      if (!RE_META_ID.test(id)) return c.json({ erro: 'ID de meta inválido' }, 400)
      const [metas, acoes] = await Promise.all([repo.metas(), repo.acoes()])
      const m = vistaMetas(metas.itens, acoes.itens, hoje()).find((x) => x.id === id)
      return m ? c.json(m, 200) : c.json(naoEncontrado('Meta'), 404)
    })

    .get('/reunioes', async (c) => {
      const r = await repo.reunioes()
      return c.json({ itens: [...r.itens].sort((a, b) => b.data.localeCompare(a.data)), erros: r.erros })
    })
    .get('/reunioes/:data', async (c) => {
      const data = c.req.param('data')
      if (!RE_DATA.test(data)) return c.json({ erro: 'Data inválida' }, 400)
      const r = (await repo.reunioes()).itens.find((x) => x.data === data)
      return r ? c.json(r, 200) : c.json(naoEncontrado('Reunião'), 404)
    })

    .get('/feedbacks', zValidator('query', filtroFeedbacks), async (c) => {
      const { reuniao, tipo } = c.req.valid('query')
      const f = await repo.feedbacks()
      const itens = f.itens
        .filter((x) => (!reuniao || x.reuniao === reuniao) && (!tipo || x.tipo === tipo))
        .sort((a, b) => b.reuniao.localeCompare(a.reuniao) || a.id.localeCompare(b.id))
      return c.json({ itens, erros: f.erros })
    })

    .get('/projetos', async (c) => {
      const p = await repo.projetos()
      return c.json(p)
    })

    .get('/agenda', zValidator('query', intervaloAgenda), async (c) => {
      const { de, ate } = c.req.valid('query')
      const { dados, erros } = await repo.dados(hoje())
      return c.json({ eventos: montarAgenda(dados, de, ate), erros })
    })

    .get('/resumo', async (c) => {
      const h = hoje()
      const { dados, erros } = await repo.dados(h)
      return c.json({ ...montarResumo(dados, h), erros })
    })
}

export type AppType = ReturnType<typeof criarApi>

/** Garante 404 em JSON e erro 500 sem stack para o cliente. */
export function comTratamentoDeErros(app: Hono) {
  app.notFound((c) => (c.req.path.startsWith('/api') ? c.json({ erro: 'Rota não encontrada' }, 404) : c.text('Não encontrado', 404)))
  app.onError((err, c) => {
    console.error(JSON.stringify({ nivel: 'erro', rota: c.req.path, metodo: c.req.method, mensagem: err.message }))
    return c.json({ erro: 'Erro interno ao ler o vault' }, 500)
  })
  return app
}

