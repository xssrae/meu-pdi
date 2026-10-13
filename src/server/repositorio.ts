// Leitura do PDI no SQLite (ADR-007): converte linhas em entidades do domínio.
// Síncrono, como o `node:sqlite`. As escritas ficam em `servicos.ts`.

import type { DadosPdi } from '../domain/aggregates'
import { hojeISO } from '../domain/metrics'
import type {
  Acao,
  Autoavaliacao,
  BlocoAgenda,
  Ciclo,
  CorTrilha,
  DataISO,
  Feedback,
  ItemChecklist,
  Maturidade,
  Meta,
  Nivel,
  Prioridade,
  Projeto,
  Reuniao,
  StatusAcao,
  StatusCompetencia,
  StatusProjeto,
  StatusReuniao,
  TipoFeedback,
  Trilha,
} from '../domain/types'
import type { Banco } from './db/conexao'

type Linha<T> = T & Record<string, unknown>

/** IDs com número (`PDI-9`, `PDI-10`) em ordem numérica. */
const POR_ID = 'ORDER BY length(id), id'

export class PdiRepository {
  constructor(readonly db: Banco) {}

  private todas<T>(sql: string, ...params: (string | number)[]): Linha<T>[] {
    return this.db.prepare(sql).all(...params) as Linha<T>[]
  }

  /** Linhas filhas agrupadas pela chave do pai, na ordem gravada. */
  private agrupar<T>(tabela: string, fk: string, mapear: (l: Record<string, unknown>) => T, ordem = 'ordem'): Map<string, T[]> {
    const m = new Map<string, T[]>()
    for (const l of this.todas<Record<string, unknown>>(`SELECT * FROM ${tabela} ORDER BY ${fk}, ${ordem}`)) {
      const pai = l[fk] as string
      m.set(pai, [...(m.get(pai) ?? []), mapear(l)])
    }
    return m
  }

  private checklists(tabela: string, fk: string) {
    return this.agrupar<ItemChecklist>(tabela, fk, (l) => ({ texto: l.texto as string, feito: l.feito === 1 }))
  }

  private textos(tabela: string, fk: string, coluna: string) {
    return this.agrupar<string>(tabela, fk, (l) => l[coluna] as string)
  }

  ciclos(): Ciclo[] {
    const avs = this.agrupar('autoavaliacao', 'ciclo_id', (l) => [
      l.competencia_id as string,
      { nivel: l.nivel as Maturidade, status: (l.status as StatusCompetencia | null) ?? null } satisfies Autoavaliacao,
    ] as const, 'competencia_id')
    return this.todas<{ id: string; inicio: string; fim: string; nivel_atual: Nivel; nivel_alvo: Nivel; versao: number }>(
      'SELECT * FROM ciclo ORDER BY inicio',
    ).map((c) => ({
      id: c.id,
      inicio: c.inicio,
      fim: c.fim,
      nivelAtual: c.nivel_atual,
      nivelAlvo: c.nivel_alvo,
      autoavaliacao: Object.fromEntries(avs.get(c.id) ?? []),
      versao: c.versao,
    }))
  }

  trilhas(): Trilha[] {
    const comps = this.textos('trilha_competencia', 'trilha_id', 'competencia_id')
    return this.todas<{ id: string; nome: string; descricao: string; cor: CorTrilha; ordem: number; versao: number }>(
      `SELECT * FROM trilha ${POR_ID}`,
    ).map((t) => ({ id: t.id, nome: t.nome, descricao: t.descricao, cor: t.cor, ordem: t.ordem, competencias: comps.get(t.id) ?? [], versao: t.versao }))
  }

  acoes(): Acao[] {
    const marcos = this.checklists('acao_marco', 'acao_id')
    const evid = this.textos('acao_evidencia', 'acao_id', 'alvo')
    return this.todas<{
      id: string
      titulo: string
      ciclo_id: string
      trilha_id: string
      competencia_id: string
      status: StatusAcao
      prioridade: Prioridade
      prazo: string | null
      versao: number
    }>(`SELECT * FROM acao ${POR_ID}`).map((a) => ({
      id: a.id,
      titulo: a.titulo,
      ciclo: a.ciclo_id,
      trilha: a.trilha_id,
      competenciaId: a.competencia_id,
      status: a.status,
      prioridade: a.prioridade,
      prazo: a.prazo,
      marcos: marcos.get(a.id) ?? [],
      evidencias: evid.get(a.id) ?? [],
      versao: a.versao,
    }))
  }

  metas(): Meta[] {
    const acoes = this.textos('meta_acao', 'meta_id', 'acao_id')
    return this.todas<{
      id: string
      titulo: string
      trilha_id: string
      reuniao_data: string
      feedback_id: string | null
      criada: string
      prazo: string
      progresso_manual: number | null
      concluida_em: string | null
      versao: number
    }>(`SELECT * FROM meta ${POR_ID}`).map((m) => ({
      id: m.id,
      titulo: m.titulo,
      trilha: m.trilha_id,
      reuniao: m.reuniao_data,
      feedback: m.feedback_id,
      criada: m.criada,
      prazo: m.prazo,
      acoes: acoes.get(m.id) ?? [],
      progressoManual: m.progresso_manual,
      concluidaEm: m.concluida_em,
      versao: m.versao,
    }))
  }

  reunioes(): Reuniao[] {
    const pautas = this.checklists('pauta_item', 'reuniao_data')
    return this.todas<{ data: string; inicio: string; fim: string; tema: string | null; status: StatusReuniao; versao: number }>(
      'SELECT * FROM reuniao ORDER BY data',
    ).map((r) => ({ data: r.data, inicio: r.inicio, fim: r.fim, tema: r.tema, status: r.status, pauta: pautas.get(r.data) ?? [], versao: r.versao }))
  }

  feedbacks(): Feedback[] {
    return this.todas<{ id: string; reuniao_data: string; tipo: TipoFeedback; competencia_id: string; meta_id: string | null; texto: string; versao: number }>(
      `SELECT * FROM feedback ${POR_ID}`,
    ).map((f) => ({ id: f.id, reuniao: f.reuniao_data, tipo: f.tipo, competenciaId: f.competencia_id, meta: f.meta_id, texto: f.texto, versao: f.versao }))
  }

  projetos(): Projeto[] {
    const trilhas = this.textos('projeto_trilha', 'projeto_id', 'trilha_id')
    const imagens = this.textos('projeto_imagem', 'projeto_id', 'nome')
    const evid = this.textos('projeto_evidencia', 'projeto_id', 'alvo')
    return this.todas<{ id: string; projeto: string; pasta: string; descricao: string; status: StatusProjeto; versao: number }>(
      'SELECT * FROM projeto ORDER BY id',
    ).map((p) => ({
      id: p.id,
      projeto: p.projeto,
      pasta: p.pasta,
      descricao: p.descricao,
      trilhas: trilhas.get(p.id) ?? [],
      status: p.status,
      imagens: imagens.get(p.id) ?? [],
      evidencias: evid.get(p.id) ?? [],
      versao: p.versao,
    }))
  }

  blocos(): BlocoAgenda[] {
    return this.todas<{
      id: string
      titulo: string
      dia_semana: number
      inicio: string
      fim: string
      de: string
      ate: string | null
      meta_id: string | null
      versao: number
    }>('SELECT * FROM bloco_agenda ORDER BY id').map((b) => ({
      id: b.id,
      titulo: b.titulo,
      diaSemana: b.dia_semana,
      inicio: b.inicio,
      fim: b.fim,
      de: b.de,
      ate: b.ate,
      meta: b.meta_id,
      versao: b.versao,
    }))
  }

  /** Ciclo vigente em `hoje`; sem um vigente, o de início mais recente. */
  cicloAtual(hoje: DataISO = hojeISO()): Ciclo | null {
    const itens = this.ciclos()
    return itens.find((c) => c.inicio <= hoje && hoje <= c.fim) ?? itens.at(-1) ?? null
  }

  /** Tudo o que as leituras agregadas precisam. */
  dados(hoje: DataISO = hojeISO()): DadosPdi {
    return {
      ciclo: this.cicloAtual(hoje),
      trilhas: this.trilhas(),
      acoes: this.acoes(),
      metas: this.metas(),
      reunioes: this.reunioes(),
      feedbacks: this.feedbacks(),
      blocos: this.blocos(),
    }
  }
}
