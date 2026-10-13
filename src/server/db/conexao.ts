// Conexão com o SQLite local (ADR-007, desenho da ADR-006): `node:sqlite`,
// sem dependência nativa. O painel e o servidor MCP abrem o mesmo arquivo.

import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { migrar } from './migracoes'

export type Banco = DatabaseSync

/** Abre (e cria, se preciso) o banco em `caminho`, ou um banco em memória com `:memory:`. */
export function abrirBanco(caminho: string): Banco {
  if (caminho !== ':memory:') mkdirSync(path.dirname(path.resolve(caminho)), { recursive: true })
  const db = new DatabaseSync(caminho)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
  `)
  try {
    migrar(db)
  } catch (e) {
    db.close()
    throw e
  }
  return db
}

/**
 * Executa `fn` numa transação `IMMEDIATE`: a trava de escrita é pega no início,
 * então duas escritas concorrentes (painel e MCP) esperam em vez de falhar no meio.
 */
export function transacao<T>(db: Banco, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}
