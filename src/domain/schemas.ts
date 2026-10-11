// Schemas Zod do frontmatter das notas do PDI e dos parâmetros da API.
// Os schemas validam o formato no vault (snake_case) e o servidor converte
// para os tipos do domínio (camelCase) em `server/vault-repository.ts`.

import { z } from 'zod'
import { isCompetenciaId } from './framework'
import type { CorTrilha, Maturidade } from './types'
import {
  CORES_TRILHA,
  NIVEIS,
  PRIORIDADES,
  STATUS_ACAO,
  STATUS_COMPETENCIA,
  STATUS_PROJETO,
  STATUS_REUNIAO,
  TIPOS_FEEDBACK,
} from './types'

export const RE_DATA = /^\d{4}-\d{2}-\d{2}$/
export const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/
export const RE_ACAO_ID = /^PDI-\d{2,}$/
export const RE_META_ID = /^M-\d{2,}$/
export const RE_FEEDBACK_ID = /^FB-\d{2,}$/
export const RE_TRILHA_ID = /^T\d+$/

export const data = z.string().regex(RE_DATA, 'data deve estar no formato AAAA-MM-DD')
export const hora = z.string().regex(RE_HORA, 'horário deve estar no formato HH:MM')
/** YAML lê `2026.2` como número; o ID do ciclo é sempre texto. */
const texto = z.union([z.string(), z.number()]).transform(String)
const opcional = <T extends z.ZodType>(s: T) => s.nullish().transform((v) => v ?? null)
const lista = <T extends z.ZodType>(s: T) => z.array(s).nullish().transform((v) => v ?? [])

export const competenciaId = z.string().refine(isCompetenciaId, { error: (i) => `competência desconhecida: ${String(i.input)}` })
const trilhaId = z.string().regex(RE_TRILHA_ID, 'trilha deve ser T1, T2…')
const tipo = (t: string) => z.literal(t).optional()

/** Remove `[[` `]]` e alias de um wikilink: `"[[nota|alias]]"` → `"nota"`. */
export function alvoWikilink(valor: string): string {
  return valor.replace(/^\[\[|\]\]$/g, '').split('|')[0]!.split('#')[0]!.trim()
}

const maturidade = z
  .number()
  .int()
  .min(1)
  .max(4)
  .transform((n) => n as Maturidade)

const autoavaliacao = z.union([
  maturidade.transform((nivel) => ({ nivel, status: null })),
  z.object({ nivel: maturidade, status: opcional(z.enum(STATUS_COMPETENCIA)) }),
])

export const cicloFm = z.object({
  type: tipo('pdi-ciclo'),
  id: texto,
  inicio: data,
  fim: data,
  nivel_atual: z.enum(NIVEIS),
  nivel_alvo: z.enum(NIVEIS),
  autoavaliacao: z
    .record(competenciaId, autoavaliacao)
    .nullish()
    .transform((v) => v ?? {}),
})

export const trilhaFm = z.object({
  type: tipo('pdi-trilha'),
  id: trilhaId,
  nome: z.string().min(1),
  cor: z
    .number()
    .int()
    .min(1)
    .max(CORES_TRILHA.length)
    .transform((n) => n as CorTrilha),
  ordem: z.number().int().optional(),
  competencias: lista(competenciaId),
})

export const acaoFm = z.object({
  type: tipo('pdi-acao'),
  id: z.string().regex(RE_ACAO_ID, 'ID da ação deve ser PDI-NN'),
  ciclo: texto,
  trilha: trilhaId,
  competencia: competenciaId,
  status: z.enum(STATUS_ACAO),
  prioridade: z.enum(PRIORIDADES).default('media'),
  prazo: opcional(data),
})

export const metaFm = z.object({
  type: tipo('pdi-meta'),
  id: z.string().regex(RE_META_ID, 'ID da meta deve ser M-NN'),
  trilha: trilhaId,
  reuniao: data,
  feedback: opcional(z.string().regex(RE_FEEDBACK_ID)),
  criada: data,
  prazo: data,
  acoes: lista(z.string().regex(RE_ACAO_ID)),
  progresso_manual: opcional(z.number().min(0).max(100)),
  concluida_em: opcional(data),
})

export const reuniaoFm = z.object({
  type: tipo('pdi-reuniao'),
  data,
  inicio: hora,
  fim: hora,
  tema: opcional(z.string()),
  status: z.enum(STATUS_REUNIAO).default('agendada'),
})

export const feedbackFm = z.object({
  type: tipo('pdi-feedback'),
  id: z.string().regex(RE_FEEDBACK_ID, 'ID do feedback deve ser FB-NN'),
  reuniao: data,
  tipo: z.enum(TIPOS_FEEDBACK),
  competencia: competenciaId,
  meta: opcional(z.string().regex(RE_META_ID)),
})

export const projetoFm = z.object({
  type: tipo('pdi-projeto'),
  projeto: z.string().min(1).transform(alvoWikilink),
  pasta: z.string().min(1),
  trilhas: lista(trilhaId),
  status: z.enum(STATUS_PROJETO).default('ativo'),
  imagens: lista(z.string()).pipe(z.array(z.string()).max(6, 'no máximo 6 imagens por projeto')),
})

export const blocoFm = z.object({
  type: tipo('pdi-bloco'),
  titulo: z.string().min(1),
  dia_semana: z.number().int().min(0).max(6),
  inicio: hora,
  fim: hora,
  de: data,
  ate: opcional(data),
  meta: opcional(z.string().regex(RE_META_ID)),
})

// ---------- Parâmetros da API ----------

export const filtroAcoes = z.object({
  ciclo: z.string().optional(),
  trilha: trilhaId.optional(),
})

export const filtroFeedbacks = z.object({
  reuniao: data.optional(),
  tipo: z.enum(TIPOS_FEEDBACK).optional(),
})

export const intervaloAgenda = z
  .object({ de: data, ate: data })
  .refine((v) => v.de <= v.ate, { message: '`de` deve ser anterior ou igual a `ate`' })
