// Processo único: API em /api e, em produção, o build estático do Vite.
// Liga só em 127.0.0.1.

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync } from 'node:fs'
import { Hono } from 'hono'
import { comTratamentoDeErros, criarApi } from './app'
import { carregarConfig } from './config'
import { VaultRepository } from './vault-repository'

const config = carregarConfig()
if (!existsSync(config.pdiDir)) {
  console.warn(`Aviso: a pasta do PDI não existe ainda: ${config.pdiDir}`)
}

const repo = new VaultRepository(config.pdiDir)
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
    repo,
    hostsPermitidos: config.hostsPermitidos,
    origensPermitidas: config.origensPermitidas,
    hoje: config.hojeFixo ? () => config.hojeFixo! : undefined,
  }),
)

if (config.producao) {
  app.use('/*', serveStatic({ root: './dist' }))
  // Fallback de SPA: rotas do React Router recebem o index.html.
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

comTratamentoDeErros(app)

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: config.porta }, (info) => {
  console.log(`meu-pdi ouvindo em http://127.0.0.1:${info.port} · PDI em ${config.pdiDir}`)
})
