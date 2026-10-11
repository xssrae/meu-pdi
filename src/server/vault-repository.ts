// Leitura das notas do PDI no vault (ADR-002). Converte frontmatter + corpo
// em entidades do domínio, tolera arquivos inválidos e guarda cache por mtime.
// A escrita (If-Match, tmp + rename, backup) entra na Fase 4.

import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { z } from 'zod'
import type { DadosPdi } from '../domain/aggregates'
import { hojeISO } from '../domain/metrics'
import { acaoFm, alvoWikilink, blocoFm, cicloFm, feedbackFm, metaFm, projetoFm, reuniaoFm, trilhaFm } from '../domain/schemas'
import type {
  Acao,
  ArquivoComErro,
  BlocoAgenda,
  Ciclo,
  DataISO,
  Feedback,
  Lista,
  Meta,
  Projeto,
  Reuniao,
  Trilha,
} from '../domain/types'
import { checklist, ErroDeNota, lerNota, secao, textoLivre, titulo, wikilinks, type Nota } from './markdown'

/** Subpastas de `PDI_DIR`, uma por entidade. */
export const PASTAS = {
  ciclos: 'Ciclos',
  trilhas: 'Trilhas',
  acoes: 'Acoes',
  metas: 'Metas',
  reunioes: 'Reunioes',
  feedbacks: 'Feedbacks',
  projetos: 'Projetos',
  agenda: 'Agenda',
} as const

interface Contexto {
  /** Caminho relativo à pasta do PDI, com `/`. */
  arquivo: string
  nome: string
  versao: string
  nota: Nota
}

type Parser<T> = (ctx: Contexto) => T

interface EntradaCache {
  mtimeMs: number
  size: number
  resultado: { ok: true; valor: unknown } | { ok: false; erro: ArquivoComErro }
}

function validar<S extends z.ZodType>(schema: S, dados: unknown): z.output<S> {
  const r = schema.safeParse(dados)
  if (r.success) return r.data
  const i = r.error.issues[0]!
  const campo = i.path.length ? `${i.path.join('.')}: ` : ''
  throw new ErroDeNota(`${campo}${i.message}`)
}

// ---------- Conversores nota → entidade ----------

const parseCiclo: Parser<Ciclo> = ({ arquivo, versao, nota }) => {
  const fm = validar(cicloFm, nota.dados)
  return { arquivo, versao, id: fm.id, inicio: fm.inicio, fim: fm.fim, nivelAtual: fm.nivel_atual, nivelAlvo: fm.nivel_alvo, autoavaliacao: fm.autoavaliacao }
}

const parseTrilha: Parser<Trilha> = ({ arquivo, versao, nota }) => {
  const fm = validar(trilhaFm, nota.dados)
  return {
    arquivo,
    versao,
    id: fm.id,
    nome: fm.nome,
    descricao: textoLivre(nota.corpo),
    cor: fm.cor,
    ordem: fm.ordem ?? Number(fm.id.slice(1)),
    competencias: fm.competencias,
  }
}

const parseAcao: Parser<Acao> = ({ arquivo, versao, nome, nota }) => {
  const fm = validar(acaoFm, nota.dados)
  return {
    arquivo,
    versao,
    id: fm.id,
    titulo: titulo(nota.corpo, nome),
    ciclo: fm.ciclo,
    trilha: fm.trilha,
    competenciaId: fm.competencia,
    status: fm.status,
    prioridade: fm.prioridade,
    prazo: fm.prazo,
    marcos: checklist(secao(nota.corpo, 'Marcos')),
    evidencias: wikilinks(secao(nota.corpo, 'Evidências')),
  }
}

const parseMeta: Parser<Meta> = ({ arquivo, versao, nome, nota }) => {
  const fm = validar(metaFm, nota.dados)
  return {
    arquivo,
    versao,
    id: fm.id,
    titulo: titulo(nota.corpo, nome),
    trilha: fm.trilha,
    reuniao: fm.reuniao,
    feedback: fm.feedback,
    criada: fm.criada,
    prazo: fm.prazo,
    acoes: fm.acoes,
    progressoManual: fm.progresso_manual,
    concluidaEm: fm.concluida_em,
  }
}

const parseReuniao: Parser<Reuniao> = ({ arquivo, versao, nota }) => {
  const fm = validar(reuniaoFm, nota.dados)
  return { arquivo, versao, data: fm.data, inicio: fm.inicio, fim: fm.fim, tema: fm.tema, status: fm.status, pauta: checklist(secao(nota.corpo, 'Pauta')) }
}

const parseFeedback: Parser<Feedback> = ({ arquivo, versao, nota }) => {
  const fm = validar(feedbackFm, nota.dados)
  return { arquivo, versao, id: fm.id, reuniao: fm.reuniao, tipo: fm.tipo, competenciaId: fm.competencia, meta: fm.meta, texto: textoLivre(nota.corpo) }
}

const parseProjeto: Parser<Projeto> = ({ arquivo, versao, nome, nota }) => {
  const fm = validar(projetoFm, nota.dados)
  return {
    arquivo,
    versao,
    id: nome.replace(/\.md$/i, ''),
    projeto: fm.projeto,
    pasta: fm.pasta,
    descricao: textoLivre(nota.corpo),
    trilhas: fm.trilhas,
    status: fm.status,
    imagens: fm.imagens.map(alvoWikilink),
    evidencias: wikilinks(secao(nota.corpo, 'Evidências')),
  }
}

const parseBloco: Parser<BlocoAgenda> = ({ arquivo, versao, nome, nota }) => {
  const fm = validar(blocoFm, nota.dados)
  return {
    arquivo,
    versao,
    id: nome.replace(/\.md$/i, ''),
    titulo: fm.titulo,
    diaSemana: fm.dia_semana,
    inicio: fm.inicio,
    fim: fm.fim,
    de: fm.de,
    ate: fm.ate,
    meta: fm.meta,
  }
}

// ---------- Repositório ----------

export class VaultRepository {
  private readonly cache = new Map<string, EntradaCache>()
  readonly raiz: string

  constructor(pdiDir: string) {
    this.raiz = path.resolve(pdiDir)
  }

  /** Lê uma subpasta, convertendo cada `.md` com `parser`. Pasta ausente = lista vazia. */
  private async listar<T>(pasta: string, parser: Parser<T>, chave: (t: T) => string): Promise<Lista<T>> {
    const dir = path.join(this.raiz, pasta)
    let nomes: string[]
    try {
      nomes = (await readdir(dir, { withFileTypes: true }))
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { itens: [], erros: [] }
      throw e
    }

    const itens: T[] = []
    const erros: ArquivoComErro[] = []
    const vistos = new Map<string, string>()

    for (const nome of nomes) {
      const abs = path.join(dir, nome)
      const arquivo = `${pasta}/${nome}`
      const r = await this.lerComCache(abs, arquivo, nome, parser)
      if (!r.ok) {
        erros.push(r.erro)
        continue
      }
      const valor = r.valor as T
      const id = chave(valor)
      const anterior = vistos.get(id)
      if (anterior) {
        erros.push({ arquivo, mensagem: `ID ${id} duplicado (já usado em ${anterior})` })
        continue
      }
      vistos.set(id, arquivo)
      itens.push(valor)
    }
    return { itens, erros }
  }

  private async lerComCache<T>(abs: string, arquivo: string, nome: string, parser: Parser<T>): Promise<EntradaCache['resultado']> {
    const st = await stat(abs)
    const c = this.cache.get(abs)
    if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c.resultado

    let resultado: EntradaCache['resultado']
    try {
      const conteudo = await readFile(abs, 'utf8')
      const versao = createHash('sha1').update(conteudo).digest('hex')
      resultado = { ok: true, valor: parser({ arquivo, nome, versao, nota: lerNota(conteudo) }) }
    } catch (e) {
      if (!(e instanceof ErroDeNota)) throw e
      resultado = { ok: false, erro: { arquivo, mensagem: e.message } }
    }
    this.cache.set(abs, { mtimeMs: st.mtimeMs, size: st.size, resultado })
    return resultado
  }

  ciclos() {
    return this.listar(PASTAS.ciclos, parseCiclo, (c) => c.id)
  }
  trilhas() {
    return this.listar(PASTAS.trilhas, parseTrilha, (t) => t.id)
  }
  acoes() {
    return this.listar(PASTAS.acoes, parseAcao, (a) => a.id)
  }
  metas() {
    return this.listar(PASTAS.metas, parseMeta, (m) => m.id)
  }
  reunioes() {
    return this.listar(PASTAS.reunioes, parseReuniao, (r) => r.data)
  }
  feedbacks() {
    return this.listar(PASTAS.feedbacks, parseFeedback, (f) => f.id)
  }
  projetos() {
    return this.listar(PASTAS.projetos, parseProjeto, (p) => p.id)
  }
  blocos() {
    return this.listar(PASTAS.agenda, parseBloco, (b) => b.id)
  }

  /** Ciclo vigente em `hoje`; sem um vigente, o de início mais recente. */
  async cicloAtual(hoje: DataISO = hojeISO()): Promise<Ciclo | null> {
    const { itens } = await this.ciclos()
    const vigente = itens.find((c) => c.inicio <= hoje && hoje <= c.fim)
    return vigente ?? [...itens].sort((a, b) => b.inicio.localeCompare(a.inicio))[0] ?? null
  }

  /** Tudo o que as leituras agregadas precisam, com os erros de todas as pastas. */
  async dados(hoje: DataISO = hojeISO()): Promise<{ dados: DadosPdi; erros: ArquivoComErro[] }> {
    const [ciclo, ciclos, trilhas, acoes, metas, reunioes, feedbacks, blocos] = await Promise.all([
      this.cicloAtual(hoje),
      this.ciclos(),
      this.trilhas(),
      this.acoes(),
      this.metas(),
      this.reunioes(),
      this.feedbacks(),
      this.blocos(),
    ])
    return {
      dados: { ciclo, trilhas: trilhas.itens, acoes: acoes.itens, metas: metas.itens, reunioes: reunioes.itens, feedbacks: feedbacks.itens, blocos: blocos.itens },
      erros: [ciclos, trilhas, acoes, metas, reunioes, feedbacks, blocos].flatMap((l) => l.erros),
    }
  }
}
