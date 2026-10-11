// Único lugar que traduz valores do domínio em classes de token (ADR-005).
// As telas nunca escolhem cor. As classes ficam escritas por extenso para o
// Tailwind encontrá-las no código.
// Regras: cor de trilha só identifica; cor de status só indica estado.

import type { TipoEvento } from '../../domain/aggregates'
import { NOME_PILAR } from '../../domain/framework'
import { STATUS_ACAO } from '../../domain/types'
import type {
  CorTrilha,
  EstadoMeta,
  Pilar,
  Prioridade,
  StatusAcao,
  StatusCompetencia,
  StatusProjeto,
  TipoFeedback,
} from '../../domain/types'

export interface Tom {
  label: string
  /** Fundo da pílula. */
  bg: string
  /** Texto sobre `bg` (contraste ≥ 4,5:1). */
  fg: string
  /** Ponto ao lado do rótulo. */
  dot: string
}

export interface TomStatusAcao extends Tom {
  /** Série de gráfico (preenchimento) e traço SVG. */
  chart: string
  stroke: string
}

export const TOM_STATUS_ACAO: Record<StatusAcao, TomStatusAcao> = {
  'nao-iniciado': { label: 'Não iniciado', bg: 'bg-status-todo-bg', fg: 'text-status-todo-fg', dot: 'bg-chart-todo', chart: 'bg-chart-todo', stroke: 'stroke-chart-todo' },
  'em-andamento': { label: 'Em andamento', bg: 'bg-status-doing-bg', fg: 'text-status-doing-fg', dot: 'bg-chart-doing', chart: 'bg-chart-doing', stroke: 'stroke-chart-doing' },
  'em-revisao': { label: 'Em revisão', bg: 'bg-status-review-bg', fg: 'text-status-review-fg', dot: 'bg-chart-review', chart: 'bg-chart-review', stroke: 'stroke-chart-review' },
  concluido: { label: 'Concluído', bg: 'bg-status-done-bg', fg: 'text-status-done-fg', dot: 'bg-chart-done', chart: 'bg-chart-done', stroke: 'stroke-chart-done' },
}

export const TOM_ESTADO_META: Record<EstadoMeta, Tom> = {
  'no-ritmo': { label: 'No ritmo', bg: 'bg-meta-ritmo-bg', fg: 'text-meta-ritmo-fg', dot: 'bg-meta-ritmo-dot' },
  'em-risco': { label: 'Em risco', bg: 'bg-meta-risco-bg', fg: 'text-meta-risco-fg', dot: 'bg-meta-risco-dot' },
  atrasada: { label: 'Atrasada', bg: 'bg-meta-atrasada-bg', fg: 'text-meta-atrasada-fg', dot: 'bg-meta-atrasada-dot' },
  concluida: { label: 'Concluída', bg: 'bg-meta-concluida-bg', fg: 'text-meta-concluida-fg', dot: 'bg-meta-concluida-dot' },
}

export const TOM_PRIORIDADE: Record<Prioridade, Tom> = {
  alta: { label: 'Alta', bg: 'bg-prio-alta-bg', fg: 'text-prio-alta-fg', dot: 'bg-prio-alta-dot' },
  media: { label: 'Média', bg: 'bg-prio-media-bg', fg: 'text-prio-media-fg', dot: 'bg-prio-media-dot' },
  baixa: { label: 'Baixa', bg: 'bg-prio-baixa-bg', fg: 'text-prio-baixa-fg', dot: 'bg-prio-baixa-dot' },
}

export const TOM_TIPO_FEEDBACK: Record<TipoFeedback, Tom> = {
  reconhecimento: { label: 'Reconhecimento', bg: 'bg-fb-reconhecimento-bg', fg: 'text-fb-reconhecimento-fg', dot: 'bg-fb-reconhecimento-dot' },
  melhoria: { label: 'Ponto de melhoria', bg: 'bg-fb-melhoria-bg', fg: 'text-fb-melhoria-fg', dot: 'bg-fb-melhoria-dot' },
  insight: { label: 'Insight', bg: 'bg-fb-insight-bg', fg: 'text-fb-insight-fg', dot: 'bg-fb-insight-dot' },
}

export const TOM_STATUS_COMPETENCIA: Record<StatusCompetencia, Tom> = {
  'nao-iniciada': { label: 'Não iniciada', bg: 'bg-comp-nao-iniciada-bg', fg: 'text-comp-nao-iniciada-fg', dot: 'bg-comp-nao-iniciada-dot' },
  'em-evolucao': { label: 'Em evolução', bg: 'bg-comp-em-evolucao-bg', fg: 'text-comp-em-evolucao-fg', dot: 'bg-comp-em-evolucao-dot' },
  'na-meta': { label: 'Na meta', bg: 'bg-comp-na-meta-bg', fg: 'text-comp-na-meta-fg', dot: 'bg-comp-na-meta-dot' },
}

export const TOM_PILAR: Record<Pilar, { label: string; dot: string }> = {
  comportamental: { label: NOME_PILAR.comportamental, dot: 'bg-pilar-comp' },
  ferramentas: { label: NOME_PILAR.ferramentas, dot: 'bg-pilar-ferr' },
  tecnica: { label: NOME_PILAR.tecnica, dot: 'bg-pilar-tec' },
}

export interface TomPasta {
  /** Corpo da pasta (tom 1). */
  bg: string
  /** Aba da pasta (tom 2). */
  tab: string
  /** Texto e ID sobre o corpo. */
  fg: string
}

/** Identidade da trilha: pastas, chips e prazos de meta. Nunca para estado. */
export const TOM_TRILHA: Record<CorTrilha, TomPasta & { borda: string; barra: string }> = {
  1: { bg: 'bg-trilha-1-bg', tab: 'bg-trilha-1-tab', fg: 'text-trilha-1-fg', borda: 'border-trilha-1-tab', barra: 'bg-trilha-1-fg' },
  2: { bg: 'bg-trilha-2-bg', tab: 'bg-trilha-2-tab', fg: 'text-trilha-2-fg', borda: 'border-trilha-2-tab', barra: 'bg-trilha-2-fg' },
  3: { bg: 'bg-trilha-3-bg', tab: 'bg-trilha-3-tab', fg: 'text-trilha-3-fg', borda: 'border-trilha-3-tab', barra: 'bg-trilha-3-fg' },
  4: { bg: 'bg-trilha-4-bg', tab: 'bg-trilha-4-tab', fg: 'text-trilha-4-fg', borda: 'border-trilha-4-tab', barra: 'bg-trilha-4-fg' },
  5: { bg: 'bg-trilha-5-bg', tab: 'bg-trilha-5-tab', fg: 'text-trilha-5-fg', borda: 'border-trilha-5-tab', barra: 'bg-trilha-5-fg' },
}

/** Pastas de Projetos: paleta própria, distinta das trilhas. Atribuída pela ordem da pasta. */
export const TOM_PASTA: readonly TomPasta[] = [
  { bg: 'bg-pasta-1-bg', tab: 'bg-pasta-1-tab', fg: 'text-ink' },
  { bg: 'bg-pasta-2-bg', tab: 'bg-pasta-2-tab', fg: 'text-ink' },
  { bg: 'bg-pasta-3-bg', tab: 'bg-pasta-3-tab', fg: 'text-ink' },
  { bg: 'bg-pasta-4-bg', tab: 'bg-pasta-4-tab', fg: 'text-ink' },
]

export function tomPasta(indice: number): TomPasta {
  return TOM_PASTA[indice % TOM_PASTA.length]!
}

/** Legenda das quatro séries de status de ação. */
export const LEGENDA_STATUS = STATUS_ACAO.map((s) => ({ rotulo: TOM_STATUS_ACAO[s].label, cor: TOM_STATUS_ACAO[s].chart }))

/** Segmentos de status de ação para a `SegmentBar`. */
export function segmentosStatus(porStatus: Record<StatusAcao, number>) {
  return STATUS_ACAO.map((s) => ({ valor: porStatus[s], rotulo: TOM_STATUS_ACAO[s].label, cor: TOM_STATUS_ACAO[s].chart }))
}

/** Cores do evento de calendário: 1:1 em tinta; prazo de meta e bloco na cor da trilha; prazo de ação com contorno. */
export function classesEvento(tipo: TipoEvento, cor?: CorTrilha | null): string {
  const trilha = cor ? TOM_TRILHA[cor] : null
  const estilo: Record<TipoEvento, string> = {
    reuniao: 'bg-ink text-on-ink',
    'prazo-meta': trilha ? `${trilha.bg} ${trilha.fg} border ${trilha.borda}` : 'bg-soft text-ink border border-line-strong',
    'prazo-acao': 'bg-card text-ink-2 border border-line-strong',
    bloco: trilha ? `${trilha.bg} ${trilha.fg}` : 'bg-soft text-ink',
    'preparar-pauta': 'bg-soft text-ink border border-dashed border-ink-3',
  }
  return estilo[tipo]
}

/** Rótulo do status do projeto. Neutro: o status do projeto não tem cor própria no design system. */
export const ROTULO_STATUS_PROJETO: Record<StatusProjeto, string> = {
  ativo: 'Ativo',
  design: 'Em design',
  andamento: 'Em andamento',
  plano: 'Planejamento',
}
