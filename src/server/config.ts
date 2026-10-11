// Configuração do servidor, só via ambiente (nunca `VITE_*`: seria público no navegador).

import { existsSync } from 'node:fs'
import path from 'node:path'

export interface Config {
  vaultDir: string
  pdiDir: string
  porta: number
  producao: boolean
  /** Data fixa para testes e demonstrações (`PDI_HOJE=AAAA-MM-DD`). */
  hojeFixo: string | null
  hostsPermitidos: string[]
  origensPermitidas: string[]
}

/** Porta padrão do Vite em desenvolvimento, que faz proxy de `/api`. */
export const PORTA_DEV_WEB = 5173

export function carregarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (env === process.env && existsSync('.env')) process.loadEnvFile('.env')

  const vaultDir = env.PDI_VAULT_DIR
  if (!vaultDir) throw new Error('Defina PDI_VAULT_DIR no .env (veja .env.example).')
  const porta = Number(env.PDI_PORT ?? 5174)
  const producao = env.NODE_ENV === 'production'
  const hojeFixo = env.PDI_HOJE ?? null
  if (hojeFixo && !/^\d{4}-\d{2}-\d{2}$/.test(hojeFixo)) throw new Error('PDI_HOJE deve estar no formato AAAA-MM-DD.')

  const portaWeb = Number(env.PDI_WEB_PORT ?? PORTA_DEV_WEB)
  const portas = producao ? [porta] : [porta, portaWeb]
  const hostsPermitidos = portas.flatMap((p) => [`127.0.0.1:${p}`, `localhost:${p}`])

  return {
    vaultDir: path.resolve(vaultDir),
    pdiDir: path.resolve(vaultDir, env.PDI_DIR ?? '03 Areas/Carreira/PDI'),
    porta,
    producao,
    hojeFixo,
    hostsPermitidos,
    origensPermitidas: hostsPermitidos.map((h) => `http://${h}`),
  }
}
