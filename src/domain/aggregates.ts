// Leituras agregadas (Visão geral, agenda e visões enriquecidas).
// Puras: recebem os dados já lidos e a data de hoje.

import { diaDaSemana, somarDias } from './datas'
import { COMPETENCIAS } from './framework'
import {
  competenciasNaMeta,
  contarPorStatus,
  diasEntre,
  estadoMeta,
  progressoAcao,
  progressoMeta,
  resumoTrilha,
  tempoDecorrido,
  type ContagemStatus,
  type ResumoTrilha,
} from './metrics'
import type {
  Acao,
  BlocoAgenda,
  Ciclo,
  CorTrilha,
  DataISO,
  EstadoMeta,
  Feedback,
  Hora,
  Meta,
  Nivel,
  Reuniao,
  Trilha,
} from './types'

export interface DadosPdi {
  ciclo: Ciclo | null
  trilhas: Trilha[]
  acoes: Acao[]
  metas: Meta[]
  reunioes: Reuniao[]
  feedbacks: Feedback[]
  blocos: BlocoAgenda[]
}

// ---------- Visões enriquecidas ----------

export interface AcaoVista extends Acao {
  progresso: number
  /** Meta que lista esta ação, se houver (a relação é gravada na meta). */
  meta: string | null
}

export interface MetaVista extends Meta {
  progresso: number
  tempoDecorrido: number
  estado: EstadoMeta
}

export function vistaAcoes(acoes: readonly Acao[], metas: readonly Meta[]): AcaoVista[] {
  const metaDe = new Map<string, string>()
  for (const m of metas) for (const id of m.acoes) if (!metaDe.has(id)) metaDe.set(id, m.id)
  return acoes.map((a) => ({ ...a, progresso: progressoAcao(a), meta: metaDe.get(a.id) ?? null }))
}

export function vistaMetas(metas: readonly Meta[], acoes: readonly Acao[], hoje: DataISO): MetaVista[] {
  return metas.map((m) => {
    const progresso = progressoMeta(m, acoes)
    return { ...m, progresso, tempoDecorrido: tempoDecorrido(m, hoje), estado: estadoMeta(m, progresso, hoje) }
  })
}

// ---------- Resumo (Visão geral + contadores da barra lateral) ----------

export interface TrilhaResumo extends ResumoTrilha {
  nome: string
  cor: CorTrilha
}

export interface Prazo {
  tipo: 'meta' | 'acao'
  id: string
  titulo: string
  data: DataISO
  trilha: string
  atrasado: boolean
}

export interface Resumo {
  hoje: DataISO
  ciclo: { id: string; inicio: DataISO; fim: DataISO; nivelAtual: Nivel; nivelAlvo: Nivel } | null
  kpis: {
    acoes: { concluidas: number; total: number; pct: number }
    metas: { ativas: number; total: number; atrasadas: number }
    competencias: { naMeta: number; total: number; nivelAlvo: Nivel | null }
    feedbacks: { total: number; reunioes: number; viraramMeta: number }
  }
  acoesPorStatus: ContagemStatus
  trilhas: TrilhaResumo[]
  proximaReuniao: (Reuniao & { emDias: number; metasParaRevisar: MetaVista[] }) | null
  prazos: Prazo[]
  ultimosFeedbacks: Feedback[]
  /** Contadores da barra lateral. */
  barraLateral: { metasAtrasadas: number; proximaReuniao: DataISO | null }
}

const ORDEM_ESTADO: Record<EstadoMeta, number> = { atrasada: 0, 'em-risco': 1, 'no-ritmo': 2, concluida: 3 }

export function montarResumo(d: DadosPdi, hoje: DataISO, limitePrazos = 5): Resumo {
  const acoes = d.ciclo ? d.acoes.filter((a) => a.ciclo === d.ciclo!.id) : d.acoes
  const porStatus = contarPorStatus(acoes)
  const metas = vistaMetas(d.metas, d.acoes, hoje)
  const ativas = metas.filter((m) => m.estado !== 'concluida')
  const atrasadas = ativas.filter((m) => m.estado === 'atrasada').length

  const proxima = d.reunioes
    .filter((r) => r.status === 'agendada' && r.data >= hoje)
    .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))[0]

  const prazos: Prazo[] = [
    ...ativas.map((m) => ({ tipo: 'meta' as const, id: m.id, titulo: m.titulo, data: m.prazo, trilha: m.trilha, atrasado: m.estado === 'atrasada' })),
    ...acoes
      .filter((a) => a.prazo && a.status !== 'concluido')
      .map((a) => ({ tipo: 'acao' as const, id: a.id, titulo: a.titulo, data: a.prazo!, trilha: a.trilha, atrasado: a.prazo! < hoje })),
  ]
    .sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id))
    .slice(0, limitePrazos)

  const feedbacks = [...d.feedbacks].sort((a, b) => b.reuniao.localeCompare(a.reuniao) || b.id.localeCompare(a.id))
  const idsCompetencias = COMPETENCIAS.map((c) => c.id)

  return {
    hoje,
    ciclo: d.ciclo
      ? { id: d.ciclo.id, inicio: d.ciclo.inicio, fim: d.ciclo.fim, nivelAtual: d.ciclo.nivelAtual, nivelAlvo: d.ciclo.nivelAlvo }
      : null,
    kpis: {
      acoes: {
        concluidas: porStatus.concluido,
        total: acoes.length,
        pct: acoes.length ? Math.round((porStatus.concluido / acoes.length) * 100) : 0,
      },
      metas: { ativas: ativas.length, total: metas.length, atrasadas },
      competencias: {
        naMeta: d.ciclo ? competenciasNaMeta(d.ciclo, idsCompetencias) : 0,
        total: idsCompetencias.length,
        nivelAlvo: d.ciclo?.nivelAlvo ?? null,
      },
      feedbacks: {
        total: d.feedbacks.length,
        reunioes: new Set(d.feedbacks.map((f) => f.reuniao)).size,
        viraramMeta: d.feedbacks.filter((f) => f.meta).length,
      },
    },
    acoesPorStatus: porStatus,
    trilhas: [...d.trilhas]
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({ ...resumoTrilha(t.id, acoes), nome: t.nome, cor: t.cor })),
    proximaReuniao: proxima
      ? {
          ...proxima,
          emDias: diasEntre(hoje, proxima.data),
          metasParaRevisar: [...ativas].sort((a, b) => ORDEM_ESTADO[a.estado] - ORDEM_ESTADO[b.estado] || a.prazo.localeCompare(b.prazo)),
        }
      : null,
    prazos,
    ultimosFeedbacks: feedbacks.slice(0, 2),
    barraLateral: { metasAtrasadas: atrasadas, proximaReuniao: proxima?.data ?? null },
  }
}

// ---------- Agenda (calendário mensal e agenda semanal) ----------

export type TipoEvento = 'reuniao' | 'prazo-meta' | 'prazo-acao' | 'bloco' | 'preparar-pauta'

export interface Evento {
  tipo: TipoEvento
  data: DataISO
  inicio: Hora | null
  fim: Hora | null
  titulo: string
  /** ID da entidade de origem (data da 1:1, M-NN, PDI-NN ou bloco). */
  ref: string
  trilha: string | null
}

/** Horário do lembrete "Preparar pauta", no dia anterior a cada 1:1. */
export const PREPARAR_PAUTA = { inicio: '17:00', fim: '17:30' } as const

export function montarAgenda(d: DadosPdi, de: DataISO, ate: DataISO): Evento[] {
  const dentro = (data: DataISO) => data >= de && data <= ate
  const eventos: Evento[] = []
  const trilhaDaMeta = new Map(d.metas.map((m) => [m.id, m.trilha]))

  for (const r of d.reunioes) {
    if (r.status === 'cancelada') continue
    if (dentro(r.data)) {
      eventos.push({ tipo: 'reuniao', data: r.data, inicio: r.inicio, fim: r.fim, titulo: r.tema ?? '1:1', ref: r.data, trilha: null })
    }
    const vespera = somarDias(r.data, -1)
    if (r.status === 'agendada' && dentro(vespera)) {
      eventos.push({ tipo: 'preparar-pauta', data: vespera, ...PREPARAR_PAUTA, titulo: 'Preparar pauta da 1:1', ref: r.data, trilha: null })
    }
  }
  for (const m of d.metas) {
    if (dentro(m.prazo)) {
      eventos.push({ tipo: 'prazo-meta', data: m.prazo, inicio: null, fim: null, titulo: m.titulo, ref: m.id, trilha: m.trilha })
    }
  }
  for (const a of d.acoes) {
    if (a.prazo && dentro(a.prazo)) {
      eventos.push({ tipo: 'prazo-acao', data: a.prazo, inicio: null, fim: null, titulo: a.titulo, ref: a.id, trilha: a.trilha })
    }
  }
  for (const b of d.blocos) {
    const ini = b.de > de ? b.de : de
    const fim = b.ate && b.ate < ate ? b.ate : ate
    for (let dia = ini; dia <= fim; dia = somarDias(dia, 1)) {
      if (diaDaSemana(dia) === b.diaSemana) {
        eventos.push({
          tipo: 'bloco',
          data: dia,
          inicio: b.inicio,
          fim: b.fim,
          titulo: b.titulo,
          ref: b.id,
          trilha: b.meta ? (trilhaDaMeta.get(b.meta) ?? null) : null,
        })
      }
    }
  }
  return eventos.sort((a, b) => (a.data + (a.inicio ?? '')).localeCompare(b.data + (b.inicio ?? '')) || a.ref.localeCompare(b.ref))
}
