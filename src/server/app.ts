// Rotas da API (Architecture §5). Encadeadas para que `hono/client`
// infira os tipos de ponta a ponta (`AppType`). Leituras vêm do
// repositório; escritas passam pelos serviços, os mesmos do MCP (ADR-007).

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { montarAgenda, montarResumo, vistaAcoes, vistaMetas } from '../domain/aggregates'
import { hojeISO, resumoTrilha } from '../domain/metrics'
import { RE_ACAO_ID, RE_DATA, RE_META_ID, filtroAcoes, filtroFeedbacks, intervaloAgenda } from '../domain/schemas'
import { ErroServico, STATUS_HTTP } from './erros'
import { protecaoLocal } from './seguranca'
import type { Entidade, Servicos } from './servicos'

export interface OpcoesApp {
  servicos: Servicos
  hostsPermitidos: string[]
  origensPermitidas: string[]
  /** Data de referência; injetável para testes. */
  hoje?: () => string
}

const naoEncontrado = (o: string) => ({ erro: `${o} não encontrado` })

/**
 * `/api/acoes`, `/api/metas`…: as escritas são iguais para todas as entidades.
 * Literal (não montado de `ENTIDADES`) para o `hono/client` manter os tipos; um teste confere os dois.
 */
export const ROTA_ENTIDADE = '/:entidade{ciclos|trilhas|acoes|metas|reunioes|feedbacks|projetos|blocos}'

/** `If-Match: "3"` (ou `3`, ou `W/"3"`) → 3; ausente → `undefined`; malformado → `null`. */
export function versaoDe(ifMatch: string | undefined): number | undefined | null {
  if (ifMatch === undefined) return undefined
  const m = /^(?:W\/)?"?(\d+)"?$/.exec(ifMatch.trim())
  return m ? Number(m[1]) : null
}

async function corpoJson(req: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ErroServico('invalido', 'O corpo da requisição não é um JSON válido.')
  }
}

export function criarApi(opts: OpcoesApp) {
  const { servicos } = opts
  const repo = servicos.repo
  const hoje = opts.hoje ?? (() => hojeISO())

  return new Hono()
    .basePath('/api')
    .use(protecaoLocal({ hosts: opts.hostsPermitidos, origens: opts.origensPermitidas }))
    .get('/saude', (c) => c.json({ ok: true as const }))

    .get('/ciclo', (c) => c.json({ ciclo: repo.cicloAtual(hoje()) }))

    .get('/trilhas', (c) => {
      const acoes = repo.acoes()
      const itens = repo
        .trilhas()
        .sort((a, b) => a.ordem - b.ordem)
        .map((t) => ({ ...t, resumo: resumoTrilha(t.id, acoes) }))
      return c.json({ itens })
    })
    .get('/trilhas/:id{T[0-9]+}', (c) => {
      const t = repo.trilhas().find((x) => x.id === c.req.param('id'))
      if (!t) return c.json(naoEncontrado('Trilha'), 404)
      return c.json({ ...t, resumo: resumoTrilha(t.id, repo.acoes()) }, 200)
    })

    .get('/acoes', zValidator('query', filtroAcoes), (c) => {
      const { ciclo, trilha } = c.req.valid('query')
      const itens = vistaAcoes(repo.acoes(), repo.metas()).filter((a) => (!ciclo || a.ciclo === ciclo) && (!trilha || a.trilha === trilha))
      return c.json({ itens })
    })
    .get('/acoes/:id', (c) => {
      const id = c.req.param('id')
      if (!RE_ACAO_ID.test(id)) return c.json({ erro: 'ID de ação inválido' }, 400)
      const a = vistaAcoes(repo.acoes(), repo.metas()).find((x) => x.id === id)
      return a ? c.json(a, 200) : c.json(naoEncontrado('Ação'), 404)
    })

    .get('/metas', (c) => c.json({ itens: vistaMetas(repo.metas(), repo.acoes(), hoje()) }))
    .get('/metas/:id', (c) => {
      const id = c.req.param('id')
      if (!RE_META_ID.test(id)) return c.json({ erro: 'ID de meta inválido' }, 400)
      const m = vistaMetas(repo.metas(), repo.acoes(), hoje()).find((x) => x.id === id)
      return m ? c.json(m, 200) : c.json(naoEncontrado('Meta'), 404)
    })

    .get('/reunioes', (c) => c.json({ itens: repo.reunioes().sort((a, b) => b.data.localeCompare(a.data)) }))
    .get('/reunioes/:data', (c) => {
      const data = c.req.param('data')
      if (!RE_DATA.test(data)) return c.json({ erro: 'Data inválida' }, 400)
      const r = repo.reunioes().find((x) => x.data === data)
      return r ? c.json(r, 200) : c.json(naoEncontrado('Reunião'), 404)
    })

    .get('/feedbacks', zValidator('query', filtroFeedbacks), (c) => {
      const { reuniao, tipo } = c.req.valid('query')
      const itens = repo
        .feedbacks()
        .filter((x) => (!reuniao || x.reuniao === reuniao) && (!tipo || x.tipo === tipo))
        .sort((a, b) => b.reuniao.localeCompare(a.reuniao) || a.id.localeCompare(b.id))
      return c.json({ itens })
    })

    .get('/projetos', (c) => c.json({ itens: repo.projetos() }))

    .get('/agenda', zValidator('query', intervaloAgenda), (c) => {
      const { de, ate } = c.req.valid('query')
      return c.json({ eventos: montarAgenda(repo.dados(hoje()), de, ate) })
    })

    .get('/resumo', (c) => {
      const h = hoje()
      return c.json(montarResumo(repo.dados(h), h))
    })

    // ---------- Escritas ----------

    .post(ROTA_ENTIDADE, async (c) => {
      const criada = servicos.criar(c.req.param('entidade') as Entidade, await corpoJson(c.req))
      c.header('ETag', `"${criada.versao}"`)
      return c.json(criada, 201)
    })
    .patch(`${ROTA_ENTIDADE}/:chave`, async (c) => {
      const versao = versaoDe(c.req.header('if-match'))
      if (versao === undefined) return c.json({ erro: 'Envie If-Match com a versão lida, para não sobrescrever outra edição.' }, 428)
      if (versao === null) return c.json({ erro: 'If-Match deve ser a versão numérica da entidade.' }, 400)
      const nova = servicos.atualizar(c.req.param('entidade') as Entidade, c.req.param('chave'), versao, await corpoJson(c.req))
      c.header('ETag', `"${nova.versao}"`)
      return c.json(nova, 200)
    })
    .delete(`${ROTA_ENTIDADE}/:chave`, (c) => {
      const versao = versaoDe(c.req.header('if-match'))
      if (versao === null) return c.json({ erro: 'If-Match deve ser a versão numérica da entidade.' }, 400)
      servicos.excluir(c.req.param('entidade') as Entidade, c.req.param('chave'), versao)
      return c.body(null, 204)
    })
}

export type AppType = ReturnType<typeof criarApi>

/** Erros dos serviços viram 400/404/409 em JSON; 404 de rota em JSON; 500 sem stack para o cliente. */
export function comTratamentoDeErros(app: Hono) {
  app.notFound((c) => (c.req.path.startsWith('/api') ? c.json({ erro: 'Rota não encontrada' }, 404) : c.text('Não encontrado', 404)))
  app.onError((err, c) => {
    if (err instanceof ErroServico) {
      return c.json({ erro: err.message, ...(err.versaoAtual !== undefined && { versaoAtual: err.versaoAtual }) }, STATUS_HTTP[err.tipo])
    }
    console.error(JSON.stringify({ nivel: 'erro', rota: c.req.path, metodo: c.req.method, mensagem: err.message }))
    return c.json({ erro: 'Erro interno do servidor local' }, 500)
  })
  return app
}
