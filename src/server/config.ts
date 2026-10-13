// Configuração do servidor, só via ambiente (nunca `VITE_*`: seria público no navegador).

import { existsSync } from 'node:fs'
import path from 'node:path'

export interface Config {
  /** Caminho do banco SQLite, ou `:memory:`. */
  db: string
  /** Pasta dos backups diários; `null` com banco em memória. */
  pastaBackups: string | null
  /** JSON carregado quando o banco está vazio (testes e `npm run dev:e2e`). */
  semente: string | null
  porta: number
  producao: boolean
  /** Data fixa para testes e demonstrações (`PDI_HOJE=AAAA-MM-DD`). */
  hojeFixo: string | null
  hostsPermitidos: string[]
  origensPermitidas: string[]
}

/** Porta padrão do Vite em desenvolvimento, que faz proxy de `/api`. */
export const PORTA_DEV_WEB = 5173

export const DB_PADRAO = 'data/pdi.db'

export function carregarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (env === process.env && existsSync('.env')) process.loadEnvFile('.env')

  const db = env.PDI_DB === ':memory:' ? ':memory:' : path.resolve(env.PDI_DB || DB_PADRAO)
  const porta = Number(env.PDI_PORT ?? 5174)
  const producao = env.NODE_ENV === 'production'
  const hojeFixo = env.PDI_HOJE ?? null
  if (hojeFixo && !/^\d{4}-\d{2}-\d{2}$/.test(hojeFixo)) throw new Error('PDI_HOJE deve estar no formato AAAA-MM-DD.')

  const portaWeb = Number(env.PDI_WEB_PORT ?? PORTA_DEV_WEB)
  const portas = producao ? [porta] : [porta, portaWeb]
  const hostsPermitidos = portas.flatMap((p) => [`127.0.0.1:${p}`, `localhost:${p}`])

  return {
    db,
    pastaBackups: db === ':memory:' ? null : path.join(path.dirname(db), 'backups'),
    semente: env.PDI_SEMENTE ? path.resolve(env.PDI_SEMENTE) : null,
    porta,
    producao,
    hojeFixo,
    hostsPermitidos,
    origensPermitidas: hostsPermitidos.map((h) => `http://${h}`),
  }
}
