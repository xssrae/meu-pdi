// Processo único: API em /api e, em produção, o build estático do Vite.
// Liga só em 127.0.0.1.

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { comTratamentoDeErros, criarApi } from './app'
import { carregarConfig } from './config'
import { abrirBanco } from './db/conexao'
import { bancoVazio, carregarSemente, lerSemente } from './db/semente'
import { Servicos } from './servicos'

const config = carregarConfig()
const db = abrirBanco(config.db)
if (config.semente && bancoVazio(db)) carregarSemente(db, lerSemente(config.semente))

const hoje = config.hojeFixo ? () => config.hojeFixo! : undefined
const servicos = new Servicos(db, { hoje, pastaBackups: config.pastaBackups })
const app = new Hono()

app.use(async (c, next) => {
  const inicio = performance.now()
  await next()
  if (c.req.path.startsWith('/api')) {
    const ms = Math.round(performance.now() - inicio)
    console.log(JSON.stringify({ metodo: c.req.method, rota: c.req.path, status: c.res.status, ms }))
  }
})

app.route(
  '/',
  criarApi({
    servicos,
    hostsPermitidos: config.hostsPermitidos,
    origensPermitidas: config.origensPermitidas,
    hoje,
  }),
)

if (config.producao) {
  app.use('/*', serveStatic({ root: './dist' }))
  // Fallback de SPA: rotas do React Router recebem o index.html.
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

comTratamentoDeErros(app)

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: config.porta }, (info) => {
  console.log(`meu-pdi ouvindo em http://127.0.0.1:${info.port} · banco em ${config.db}`)
})

// Fecha o banco ao sair: o WAL é incorporado e o arquivo fica consistente.
for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sinal, () => {
    db.close()
    process.exit(0)
  })
}
