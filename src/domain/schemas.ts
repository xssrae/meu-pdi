// Schemas Zod das escritas (API HTTP e MCP compartilham os mesmos, via
// `server/servicos.ts`) e dos parâmetros de consulta da API.

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

export const competenciaId = z.string().refine(isCompetenciaId, { error: (i) => `competência desconhecida: ${String(i.input)}` })
const trilhaId = z.string().regex(RE_TRILHA_ID, 'trilha deve ser T1, T2…')

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

const textoObrigatorio = (campo: string) => z.string().trim().min(1, `${campo} é obrigatório`)
const item = z.strictObject({ texto: textoObrigatorio('texto'), feito: z.boolean().default(false) })
const wikilink = z.string().trim().min(1).transform(alvoWikilink)

// ---------- Entrada das escritas (API e MCP) ----------
// Cada schema descreve a entidade inteira, sem `id` gerado e sem `versao`.
// Criar usa os padrões; atualizar mescla o patch na entidade atual e valida
// o resultado com o mesmo schema. Campos desconhecidos são recusados.

export const cicloEntrada = z
  .strictObject({
    id: textoObrigatorio('id'),
    inicio: data,
    fim: data,
    nivelAtual: z.enum(NIVEIS),
    nivelAlvo: z.enum(NIVEIS),
    autoavaliacao: z
      .record(competenciaId, z.strictObject({ nivel: maturidade, status: z.enum(STATUS_COMPETENCIA).nullable().default(null) }))
      .default({}),
  })
  .refine((c) => c.inicio <= c.fim, { message: 'o início do ciclo deve ser anterior ao fim', path: ['fim'] })

export const trilhaEntrada = z.strictObject({
  nome: textoObrigatorio('nome'),
  descricao: z.string().trim().default(''),
  cor: z
    .number()
    .int()
    .min(1)
    .max(CORES_TRILHA.length)
    .transform((n) => n as CorTrilha),
  ordem: z.number().int().optional(),
  competencias: z.array(competenciaId).default([]),
})

export const acaoEntrada = z.strictObject({
  titulo: textoObrigatorio('título'),
  ciclo: textoObrigatorio('ciclo'),
  trilha: trilhaId,
  competenciaId,
  status: z.enum(STATUS_ACAO).default('nao-iniciado'),
  prioridade: z.enum(PRIORIDADES).default('media'),
  prazo: data.nullable().default(null),
  marcos: z.array(item).default([]),
  evidencias: z.array(wikilink).default([]),
})

export const metaEntrada = z.strictObject({
  titulo: textoObrigatorio('título'),
  trilha: trilhaId,
  reuniao: data,
  feedback: z.string().regex(RE_FEEDBACK_ID, 'feedback deve ser FB-NN').nullable().default(null),
  criada: data.optional(),
  prazo: data,
  acoes: z.array(z.string().regex(RE_ACAO_ID, 'ação deve ser PDI-NN')).default([]),
  progressoManual: z.number().min(0).max(100).nullable().default(null),
  concluidaEm: data.nullable().default(null),
})

export const reuniaoEntrada = z
  .strictObject({
    data,
    inicio: hora,
    fim: hora,
    tema: z.string().trim().nullable().default(null),
    status: z.enum(STATUS_REUNIAO).default('agendada'),
    pauta: z.array(item).default([]),
  })
  .refine((r) => r.inicio < r.fim, { message: 'o início deve ser antes do fim', path: ['fim'] })

export const feedbackEntrada = z.strictObject({
  reuniao: data,
  tipo: z.enum(TIPOS_FEEDBACK),
  competenciaId,
  meta: z.string().regex(RE_META_ID, 'meta deve ser M-NN').nullable().default(null),
  texto: z.string().trim().default(''),
})

export const projetoEntrada = z.strictObject({
  projeto: textoObrigatorio('projeto').transform(alvoWikilink),
  pasta: textoObrigatorio('pasta'),
  descricao: z.string().trim().default(''),
  trilhas: z.array(trilhaId).default([]),
  status: z.enum(STATUS_PROJETO).default('ativo'),
  imagens: z.array(z.string().min(1)).max(6, 'no máximo 6 imagens por projeto').default([]),
  evidencias: z.array(wikilink).default([]),
})

export const blocoEntrada = z
  .strictObject({
    titulo: textoObrigatorio('título'),
    diaSemana: z.number().int().min(0).max(6),
    inicio: hora,
    fim: hora,
    de: data,
    ate: data.nullable().default(null),
    meta: z.string().regex(RE_META_ID, 'meta deve ser M-NN').nullable().default(null),
  })
  .refine((b) => b.inicio < b.fim, { message: 'o início deve ser antes do fim', path: ['fim'] })

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
