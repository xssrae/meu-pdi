import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CORES_TRILHA,
  ESTADOS_META,
  PILARES,
  PRIORIDADES,
  STATUS_ACAO,
  STATUS_COMPETENCIA,
  TIPOS_FEEDBACK,
} from '../../domain/types'
import {
  TOM_ESTADO_META,
  TOM_PASTA,
  TOM_PILAR,
  TOM_PRIORIDADE,
  TOM_STATUS_ACAO,
  TOM_STATUS_COMPETENCIA,
  TOM_TIPO_FEEDBACK,
  TOM_TRILHA,
} from './tones'

const css = readFileSync(path.resolve('src/web/styles/index.css'), 'utf8')
/** Cores expostas ao Tailwind (`--color-<nome>`). */
const coresDoTema = new Set([...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]!))

/** Extrai o nome da cor de uma classe utilitária (`bg-chart-todo` → `chart-todo`). */
function corDaClasse(classe: string): string {
  return classe.replace(/^(bg|text|border|stroke|fill)-/, '')
}

function classesDe(obj: object): string[] {
  return Object.values(obj).flatMap((v) => (typeof v === 'object' && v ? classesDe(v) : []))
    .concat(Object.entries(obj).filter(([k, v]) => k !== 'label' && typeof v === 'string').map(([, v]) => v as string))
}

describe('tones', () => {
  it.each([
    ['status de ação', TOM_STATUS_ACAO, STATUS_ACAO],
    ['estado de meta', TOM_ESTADO_META, ESTADOS_META],
    ['prioridade', TOM_PRIORIDADE, PRIORIDADES],
    ['tipo de feedback', TOM_TIPO_FEEDBACK, TIPOS_FEEDBACK],
    ['status de competência', TOM_STATUS_COMPETENCIA, STATUS_COMPETENCIA],
    ['pilar', TOM_PILAR, PILARES],
    ['trilha', TOM_TRILHA, CORES_TRILHA],
  ] as const)('cobre todo valor de %s com rótulo ou cor', (_, mapa, valores) => {
    expect(Object.keys(mapa).sort()).toEqual(valores.map(String).sort())
  })

  it('usa só cores que existem no tema', () => {
    const todas = [TOM_STATUS_ACAO, TOM_ESTADO_META, TOM_PRIORIDADE, TOM_TIPO_FEEDBACK, TOM_STATUS_COMPETENCIA, TOM_PILAR, TOM_TRILHA, TOM_PASTA].flatMap(classesDe)
    const faltando = [...new Set(todas.map(corDaClasse))].filter((c) => !coresDoTema.has(c))
    expect(faltando).toEqual([])
  })

  it('mantém pastas de projeto com paleta distinta das trilhas', () => {
    const trilhas = new Set(Object.values(TOM_TRILHA).map((t) => t.bg))
    expect(TOM_PASTA.some((p) => trilhas.has(p.bg))).toBe(false)
  })
})
