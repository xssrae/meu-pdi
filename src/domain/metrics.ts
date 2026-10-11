// Regras de cálculo puras. Tudo aqui é derivado dos dados e nunca gravado.

import { competencia } from './framework'
import type {
  Acao,
  Autoavaliacao,
  Ciclo,
  DataISO,
  EstadoMeta,
  ItemChecklist,
  Maturidade,
  Meta,
  Nivel,
  StatusAcao,
  StatusCompetencia,
  Trilha,
} from './types'
import { NIVEIS, STATUS_ACAO } from './types'

// ---------- Datas ----------

const DIA_MS = 86_400_000

function diaUTC(data: DataISO): number {
  const [a, m, d] = data.split('-').map(Number)
  return Date.UTC(a!, m! - 1, d!)
}

/** Diferença em dias inteiros (`b - a`). */
export function diasEntre(a: DataISO, b: DataISO): number {
  return Math.round((diaUTC(b) - diaUTC(a)) / DIA_MS)
}

/** Data local de hoje em ISO, sem fuso. */
export function hojeISO(agora: Date = new Date()): DataISO {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`
}

// ---------- Ações ----------

export function proximoStatus(s: StatusAcao): StatusAcao | null {
  const i = STATUS_ACAO.indexOf(s)
  return STATUS_ACAO[i + 1] ?? null
}

export function statusAnterior(s: StatusAcao): StatusAcao | null {
  const i = STATUS_ACAO.indexOf(s)
  return i > 0 ? STATUS_ACAO[i - 1]! : null
}

export interface Progresso {
  feitos: number
  total: number
  /** 0–100, inteiro. */
  pct: number
}

export function progressoChecklist(itens: readonly ItemChecklist[]): Progresso {
  const total = itens.length
  const feitos = itens.filter((i) => i.feito).length
  return { feitos, total, pct: total ? Math.round((feitos / total) * 100) : 0 }
}

/** Fração exata (0–1) de uma ação: concluída vale 1; senão, a fração de marcos. */
function fracaoAcao(acao: Pick<Acao, 'status' | 'marcos'>): number {
  if (acao.status === 'concluido') return 1
  const { feitos, total } = progressoChecklist(acao.marcos)
  return total ? feitos / total : 0
}

/** Progresso de uma ação em %, inteiro. */
export function progressoAcao(acao: Pick<Acao, 'status' | 'marcos'>): number {
  return Math.round(fracaoAcao(acao) * 100)
}

export type ContagemStatus = Record<StatusAcao, number>

export function contarPorStatus(acoes: readonly Pick<Acao, 'status'>[]): ContagemStatus {
  const c = Object.fromEntries(STATUS_ACAO.map((s) => [s, 0])) as ContagemStatus
  for (const a of acoes) c[a.status]++
  return c
}

export interface ResumoTrilha {
  trilha: string
  total: number
  concluidas: number
  pct: number
  porStatus: ContagemStatus
}

export function resumoTrilha(trilhaId: string, acoes: readonly Acao[]): ResumoTrilha {
  const daTrilha = acoes.filter((a) => a.trilha === trilhaId)
  const porStatus = contarPorStatus(daTrilha)
  const total = daTrilha.length
  return {
    trilha: trilhaId,
    total,
    concluidas: porStatus.concluido,
    pct: total ? Math.round((porStatus.concluido / total) * 100) : 0,
    porStatus,
  }
}

// ---------- Competências ----------

/** Maturidade-meta de uma competência para o nível-alvo (Pleno → 2). */
export function maturidadeMeta(nivelAlvo: Nivel): Maturidade {
  return (NIVEIS.indexOf(nivelAlvo) + 1) as Maturidade
}

/** Quantos níveis faltam até a meta (0 = na meta ou acima). */
export function lacuna(nivel: Maturidade | undefined, nivelAlvo: Nivel): number {
  return Math.max(0, maturidadeMeta(nivelAlvo) - (nivel ?? 1))
}

/** Sugestão de status quando a usuária ainda não definiu um (F12). */
export function statusSugerido(nivel: Maturidade | undefined, nivelAlvo: Nivel): StatusCompetencia {
  return lacuna(nivel, nivelAlvo) === 0 ? 'na-meta' : 'nao-iniciada'
}

export function statusCompetencia(av: Autoavaliacao | undefined, nivelAlvo: Nivel): StatusCompetencia {
  return av?.status ?? statusSugerido(av?.nivel, nivelAlvo)
}

export function competenciasNaMeta(ciclo: Pick<Ciclo, 'autoavaliacao' | 'nivelAlvo'>, ids: readonly string[]): number {
  return ids.filter((id) => lacuna(ciclo.autoavaliacao[id]?.nivel, ciclo.nivelAlvo) === 0).length
}

/** Competências do framework que não estão em nenhuma trilha (regra F11). */
export function competenciasSemTrilha(ids: readonly string[], trilhas: readonly Pick<Trilha, 'competencias'>[]): string[] {
  const usadas = new Set(trilhas.flatMap((t) => t.competencias))
  return ids.filter((id) => !usadas.has(id))
}

/** A competência da ação precisa pertencer à trilha da ação. */
export function competenciaPertenceATrilha(competenciaId: string, trilha: Pick<Trilha, 'competencias'>): boolean {
  return Boolean(competencia(competenciaId)) && trilha.competencias.includes(competenciaId)
}

// ---------- Metas ----------

/** Folga, em pontos percentuais, antes de uma meta ser considerada em risco. */
export const LIMIAR_RISCO_PP = 25

/** Progresso da meta: manual, se houver; senão a média do progresso das ações ligadas. */
export function progressoMeta(meta: Pick<Meta, 'acoes' | 'progressoManual'>, acoes: readonly Acao[]): number {
  if (meta.progressoManual != null) return Math.min(100, Math.max(0, Math.round(meta.progressoManual)))
  const ligadas = acoes.filter((a) => meta.acoes.includes(a.id))
  if (!ligadas.length) return 0
  return Math.round((ligadas.reduce((s, a) => s + fracaoAcao(a), 0) / ligadas.length) * 100)
}

/** Fração do prazo já decorrida, 0–100. */
export function tempoDecorrido(meta: Pick<Meta, 'criada' | 'prazo'>, hoje: DataISO): number {
  const total = diasEntre(meta.criada, meta.prazo)
  if (total <= 0) return 100
  const passado = diasEntre(meta.criada, hoje)
  return Math.min(100, Math.max(0, Math.round((passado / total) * 100)))
}

export function estadoMeta(
  meta: Pick<Meta, 'criada' | 'prazo' | 'concluidaEm'>,
  progresso: number,
  hoje: DataISO,
): EstadoMeta {
  if (meta.concluidaEm || progresso >= 100) return 'concluida'
  if (diasEntre(meta.prazo, hoje) > 0) return 'atrasada'
  if (progresso < tempoDecorrido(meta, hoje) - LIMIAR_RISCO_PP) return 'em-risco'
  return 'no-ritmo'
}

// ---------- IDs sequenciais ----------

/** Próximo ID com prefixo (`PDI-`, `M-`, `FB-`), sempre gerado pelo servidor. */
export function proximoId(prefixo: string, existentes: readonly string[]): string {
  const re = new RegExp(`^${prefixo.replace(/[-]/g, '\\-')}(\\d+)$`)
  const max = existentes.reduce((m, id) => {
    const n = re.exec(id)?.[1]
    return n ? Math.max(m, Number(n)) : m
  }, 0)
  return `${prefixo}${String(max + 1).padStart(2, '0')}`
}
