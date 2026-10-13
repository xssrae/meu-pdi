// Backup diário (ADR-006): na primeira escrita do dia, `VACUUM INTO` gera
// um snapshot consistente de um arquivo só. Ficam os 14 mais recentes.

import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import type { Banco } from './conexao'

const MANTER = 14
const RE_BACKUP = /^pdi-\d{4}-\d{2}-\d{2}\.db$/

/** Cria `pdi-AAAA-MM-DD.db` em `pasta` se ainda não existe e apaga os antigos. Não pode rodar dentro de uma transação. */
export function backupDoDia(db: Banco, pasta: string, hoje: string): string | null {
  const alvo = path.join(pasta, `pdi-${hoje}.db`)
  if (existsSync(alvo)) return null
  mkdirSync(pasta, { recursive: true })
  db.prepare('VACUUM INTO ?').run(alvo)

  const antigos = readdirSync(pasta)
    .filter((n) => RE_BACKUP.test(n))
    .sort()
    .reverse()
    .slice(MANTER)
  for (const n of antigos) rmSync(path.join(pasta, n))
  return alvo
}
