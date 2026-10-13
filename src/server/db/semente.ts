// Carga de um PDI inteiro num banco vazio: semente dos testes e do
// `npm run dev:e2e` (`tests/fixtures/pdi.json`).

import { readFileSync } from 'node:fs'
import type { Acao, BlocoAgenda, Ciclo, Feedback, Meta, Projeto, Reuniao, Trilha } from '../../domain/types'
import { transacao, type Banco } from './conexao'
import { gravarAcao, gravarBloco, gravarCiclo, gravarFeedback, gravarMeta, gravarProjeto, gravarReuniao, gravarTrilha, type SemVersao } from './gravacao'

export interface Semente {
  ciclos: SemVersao<Ciclo>[]
  trilhas: SemVersao<Trilha>[]
  acoes: SemVersao<Acao>[]
  metas: SemVersao<Meta>[]
  reunioes: SemVersao<Reuniao>[]
  feedbacks: SemVersao<Feedback>[]
  projetos: SemVersao<Projeto>[]
  blocos: SemVersao<BlocoAgenda>[]
}

/** Grava a semente numa transação só, na ordem das chaves estrangeiras. */
export function carregarSemente(db: Banco, s: Semente): void {
  transacao(db, () => {
    for (const c of s.ciclos) gravarCiclo(db, c, 1)
    for (const t of s.trilhas) gravarTrilha(db, t, 1)
    for (const r of s.reunioes) gravarReuniao(db, r, 1)
    for (const a of s.acoes) gravarAcao(db, a, 1)
    // Metas e feedbacks se apontam: as FKs entre eles são conferidas no COMMIT.
    for (const m of s.metas) gravarMeta(db, m, 1)
    for (const f of s.feedbacks) gravarFeedback(db, f, 1)
    for (const p of s.projetos) gravarProjeto(db, p, 1)
    for (const b of s.blocos) gravarBloco(db, b, 1)
  })
}

export function lerSemente(caminho: string): Semente {
  return JSON.parse(readFileSync(caminho, 'utf8')) as Semente
}

/** O banco não tem nenhum ciclo nem trilha: ainda não foi preenchido. */
export function bancoVazio(db: Banco): boolean {
  const { n } = db.prepare('SELECT (SELECT count(*) FROM ciclo) + (SELECT count(*) FROM trilha) AS n').get() as { n: number }
  return n === 0
}
