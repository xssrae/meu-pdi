// Escritas do PDI (ADR-007): validação Zod, IDs gerados no servidor,
// transação, concorrência otimista por `versao` e backup diário. A API HTTP
// (`app.ts`) e o servidor MCP (`mcp.ts`) são bordas finas sobre esta classe,
// então um agente não grava nada que o painel recusaria.

import { z } from 'zod'
import { hojeISO, proximoId } from '../domain/metrics'
import {
  acaoEntrada,
  blocoEntrada,
  cicloEntrada,
  feedbackEntrada,
  metaEntrada,
  projetoEntrada,
  reuniaoEntrada,
  trilhaEntrada,
} from '../domain/schemas'
import type { Acao, BlocoAgenda, Ciclo, DataISO, Feedback, Meta, Projeto, Reuniao, Trilha } from '../domain/types'
import { backupDoDia } from './db/backup'
import { transacao, type Banco } from './db/conexao'
import {
  gravarAcao,
  gravarBloco,
  gravarCiclo,
  gravarFeedback,
  gravarMeta,
  gravarProjeto,
  gravarReuniao,
  gravarTrilha,
  type SemVersao,
} from './db/gravacao'
import { ErroServico, mensagemZod } from './erros'
import { PdiRepository } from './repositorio'

export const ENTIDADES = ['ciclos', 'trilhas', 'acoes', 'metas', 'reunioes', 'feedbacks', 'projetos', 'blocos'] as const
export type Entidade = (typeof ENTIDADES)[number]

export interface TipoDe {
  ciclos: Ciclo
  trilhas: Trilha
  acoes: Acao
  metas: Meta
  reunioes: Reuniao
  feedbacks: Feedback
  projetos: Projeto
  blocos: BlocoAgenda
}

type Qualquer = TipoDe[Entidade]
type Dados = Record<string, unknown>
/** Tabela e coluna-chave de cada entidade que pode ser referenciada. */
type Alvo = 'ciclo' | 'trilha' | 'acao' | 'meta' | 'reuniao' | 'feedback'

interface Definicao {
  /** "a ação", "o feedback": usado nas mensagens. */
  nome: string
  schema: z.ZodType<Dados, unknown>
  tabela: string
  coluna: string
  listar(repo: PdiRepository): Qualquer[]
  chave(t: Qualquer): string
  /** Gera a chave de uma entidade nova (as que não têm chave escolhida pelo usuário). */
  novaChave?(dados: Dados, existentes: string[]): string
  gravar(db: Banco, t: Dados, versao: number, chaveAnterior?: string): void
  /** Referências a conferir antes de gravar, com mensagens legíveis (as FKs são a última barreira). */
  refs?(d: Dados): [Alvo, unknown, string][]
  /** Mensagem quando a exclusão deixaria órfãos (`ON DELETE RESTRICT`). */
  bloqueioExclusao?(db: Banco, chave: string): string | null
  /** Permite trocar a chave ao atualizar (remarcar uma 1:1). */
  renomeavel?: boolean
  /** Mescla especial de algum campo no patch (ex.: autoavaliação por competência). */
  mesclar?(atual: Dados, patch: Dados): Dados
}

const ALVOS: Record<Alvo, { tabela: string; coluna: string; nome: string }> = {
  ciclo: { tabela: 'ciclo', coluna: 'id', nome: 'o ciclo' },
  trilha: { tabela: 'trilha', coluna: 'id', nome: 'a trilha' },
  acao: { tabela: 'acao', coluna: 'id', nome: 'a ação' },
  meta: { tabela: 'meta', coluna: 'id', nome: 'a meta' },
  reuniao: { tabela: 'reuniao', coluna: 'data', nome: 'a 1:1 de' },
  feedback: { tabela: 'feedback', coluna: 'id', nome: 'o feedback' },
}

function contar(db: Banco, sql: string, chave: string): number {
  return (db.prepare(sql).get(chave) as { n: number }).n
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

/** `"Pipeline de Dados!"` → `"pipeline-de-dados"`, único entre `existentes`. */
export function slug(texto: string, existentes: readonly string[]): string {
  const base =
    texto
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'item'
  let s = base
  for (let i = 2; existentes.includes(s); i++) s = `${base}-${i}`
  return s
}

const DEFINICOES: Record<Entidade, Definicao> = {
  ciclos: {
    nome: 'o ciclo',
    schema: cicloEntrada,
    tabela: 'ciclo',
    coluna: 'id',
    listar: (r) => r.ciclos(),
    chave: (t) => (t as Ciclo).id,
    gravar: (db, t, v) => gravarCiclo(db, t as SemVersao<Ciclo>, v),
    bloqueioExclusao: (db, id) => {
      const n = contar(db, 'SELECT count(*) AS n FROM acao WHERE ciclo_id = ?', id)
      return n ? `O ciclo ${id} tem ${plural(n, 'ação', 'ações')}. Exclua ou mova as ações antes.` : null
    },
    // Um patch de autoavaliação altera só as competências enviadas; `null` remove uma.
    mesclar: (atual, patch) => {
      if (!patch.autoavaliacao || typeof patch.autoavaliacao !== 'object') return patch
      const av: Dados = { ...(atual.autoavaliacao as Dados), ...(patch.autoavaliacao as Dados) }
      for (const [k, v] of Object.entries(av)) if (v === null) delete av[k]
      return { ...patch, autoavaliacao: av }
    },
  },
  trilhas: {
    nome: 'a trilha',
    schema: trilhaEntrada,
    tabela: 'trilha',
    coluna: 'id',
    listar: (r) => r.trilhas(),
    chave: (t) => (t as Trilha).id,
    novaChave: (_d, ex) => `T${Math.max(0, ...ex.map((id) => Number(id.slice(1)) || 0)) + 1}`,
    gravar: (db, t, v) => gravarTrilha(db, { ...t, ordem: (t.ordem as number | undefined) ?? Number((t.id as string).slice(1)) } as SemVersao<Trilha>, v),
    bloqueioExclusao: (db, id) => {
      const a = contar(db, 'SELECT count(*) AS n FROM acao WHERE trilha_id = ?', id)
      const m = contar(db, 'SELECT count(*) AS n FROM meta WHERE trilha_id = ?', id)
      if (!a && !m) return null
      const partes = [a && plural(a, 'ação', 'ações'), m && plural(m, 'meta', 'metas')].filter(Boolean).join(' e ')
      return `A trilha ${id} tem ${partes}. Exclua ou mova para outra trilha antes.`
    },
  },
  acoes: {
    nome: 'a ação',
    schema: acaoEntrada,
    tabela: 'acao',
    coluna: 'id',
    listar: (r) => r.acoes(),
    chave: (t) => (t as Acao).id,
    novaChave: (_d, ex) => proximoId('PDI-', ex),
    gravar: (db, t, v) => gravarAcao(db, t as SemVersao<Acao>, v),
    refs: (d) => [
      ['ciclo', d.ciclo, 'ciclo'],
      ['trilha', d.trilha, 'trilha'],
    ],
  },
  metas: {
    nome: 'a meta',
    schema: metaEntrada,
    tabela: 'meta',
    coluna: 'id',
    listar: (r) => r.metas(),
    chave: (t) => (t as Meta).id,
    novaChave: (_d, ex) => proximoId('M-', ex),
    gravar: (db, t, v) => gravarMeta(db, t as SemVersao<Meta>, v),
    refs: (d) => [
      ['trilha', d.trilha, 'trilha'],
      ['reuniao', d.reuniao, 'reuniao'],
      ['feedback', d.feedback, 'feedback'],
      ...(d.acoes as string[]).map((a): [Alvo, unknown, string] => ['acao', a, 'acoes']),
    ],
  },
  reunioes: {
    nome: 'a 1:1 de',
    schema: reuniaoEntrada,
    tabela: 'reuniao',
    coluna: 'data',
    listar: (r) => r.reunioes(),
    chave: (t) => (t as Reuniao).data,
    gravar: (db, t, v, anterior) => gravarReuniao(db, t as SemVersao<Reuniao>, v, anterior),
    renomeavel: true,
    bloqueioExclusao: (db, data) => {
      const m = contar(db, 'SELECT count(*) AS n FROM meta WHERE reuniao_data = ?', data)
      const f = contar(db, 'SELECT count(*) AS n FROM feedback WHERE reuniao_data = ?', data)
      if (!m && !f) return null
      const partes = [f && plural(f, 'feedback', 'feedbacks'), m && plural(m, 'meta', 'metas')].filter(Boolean).join(' e ')
      return `A 1:1 de ${data} tem ${partes}. Exclua esses registros antes, ou marque a 1:1 como cancelada.`
    },
  },
  feedbacks: {
    nome: 'o feedback',
    schema: feedbackEntrada,
    tabela: 'feedback',
    coluna: 'id',
    listar: (r) => r.feedbacks(),
    chave: (t) => (t as Feedback).id,
    novaChave: (_d, ex) => proximoId('FB-', ex),
    gravar: (db, t, v) => gravarFeedback(db, t as SemVersao<Feedback>, v),
    refs: (d) => [
      ['reuniao', d.reuniao, 'reuniao'],
      ['meta', d.meta, 'meta'],
    ],
  },
  projetos: {
    nome: 'o projeto',
    schema: projetoEntrada,
    tabela: 'projeto',
    coluna: 'id',
    listar: (r) => r.projetos(),
    chave: (t) => (t as Projeto).id,
    novaChave: (d, ex) => slug(d.projeto as string, ex),
    gravar: (db, t, v) => gravarProjeto(db, t as SemVersao<Projeto>, v),
    refs: (d) => (d.trilhas as string[]).map((t): [Alvo, unknown, string] => ['trilha', t, 'trilhas']),
  },
  blocos: {
    nome: 'o bloco de agenda',
    schema: blocoEntrada,
    tabela: 'bloco_agenda',
    coluna: 'id',
    listar: (r) => r.blocos(),
    chave: (t) => (t as BlocoAgenda).id,
    novaChave: (d, ex) => slug(d.titulo as string, ex),
    gravar: (db, t, v) => gravarBloco(db, t as SemVersao<BlocoAgenda>, v),
    refs: (d) => [['meta', d.meta, 'meta']],
  },
}

export interface OpcoesServicos {
  /** Data de referência (`criada` das metas, nome do backup). */
  hoje?: () => DataISO
  /** Pasta dos backups diários; `null` desliga (testes, banco em memória). */
  pastaBackups?: string | null
}

export class Servicos {
  readonly repo: PdiRepository
  private readonly hoje: () => DataISO
  private readonly pastaBackups: string | null

  constructor(
    readonly db: Banco,
    opts: OpcoesServicos = {},
  ) {
    this.repo = new PdiRepository(db)
    this.hoje = opts.hoje ?? (() => hojeISO())
    this.pastaBackups = opts.pastaBackups ?? null
  }

  listar<E extends Entidade>(entidade: E): TipoDe[E][] {
    return DEFINICOES[entidade].listar(this.repo) as TipoDe[E][]
  }

  obter<E extends Entidade>(entidade: E, chave: string): TipoDe[E] {
    const def = DEFINICOES[entidade]
    const t = def.listar(this.repo).find((x) => def.chave(x) === chave)
    if (!t) throw new ErroServico('nao-encontrado', `Não encontrei ${def.nome} ${chave}.`)
    return t as TipoDe[E]
  }

  criar<E extends Entidade>(entidade: E, dados: unknown): TipoDe[E] {
    const def = DEFINICOES[entidade]
    const entrada = this.validar(def, this.objeto(dados))
    if (entidade === 'metas') entrada.criada ??= this.hoje()

    return this.escrever(() => {
      const existentes = def.listar(this.repo).map(def.chave)
      const chave = def.novaChave ? def.novaChave(entrada, existentes) : String(entrada[def.coluna])
      if (!def.novaChave && existentes.includes(chave)) {
        throw new ErroServico('conflito', `Já existe ${def.nome} ${chave}.`)
      }
      const nova = def.novaChave ? { id: chave, ...entrada } : entrada
      this.conferirRefs(def, nova)
      def.gravar(this.db, nova, 1)
      this.sincronizarVinculo(entidade, chave, null, nova)
      return this.obter(entidade, chave)
    })
  }

  atualizar<E extends Entidade>(entidade: E, chave: string, versao: number | undefined, patch: unknown): TipoDe[E] {
    const def = DEFINICOES[entidade]
    const p = this.objeto(patch)
    return this.escrever(() => {
      const atual = this.obter(entidade, chave) as unknown as Dados
      this.conferirVersao(def, chave, atual.versao as number, versao)

      // A chave gerada (`id`) nunca muda; a escolhida (ciclo, data da 1:1) só muda se a entidade permitir.
      const base: Dados = { ...atual }
      delete base.versao
      if (def.novaChave) delete base.id
      const mesclado = { ...base, ...(def.mesclar ? def.mesclar(atual, p) : p) }
      if (def.novaChave) delete mesclado.id
      const entrada = this.validar(def, mesclado)
      const nova = def.novaChave ? { id: chave, ...entrada } : entrada
      const novaChave = def.chave(nova as unknown as Qualquer)

      if (novaChave !== chave) {
        if (!def.renomeavel) throw new ErroServico('invalido', `A chave de ${def.nome} ${chave} não pode mudar.`)
        if (def.listar(this.repo).some((x) => def.chave(x) === novaChave)) {
          throw new ErroServico('conflito', `Já existe ${def.nome} ${novaChave}.`)
        }
      }
      this.conferirRefs(def, nova)
      def.gravar(this.db, nova, (atual.versao as number) + 1, chave)
      this.sincronizarVinculo(entidade, novaChave, atual, nova)
      return this.obter(entidade, novaChave)
    })
  }

  excluir(entidade: Entidade, chave: string, versao?: number): void {
    const def = DEFINICOES[entidade]
    this.escrever(() => {
      const atual = this.obter(entidade, chave) as unknown as Dados
      this.conferirVersao(def, chave, atual.versao as number, versao)
      const bloqueio = def.bloqueioExclusao?.(this.db, chave)
      if (bloqueio) throw new ErroServico('restricao', bloqueio)

      // Quem aponta para a entidade muda junto (cascata ou SET NULL): ganha versão nova.
      if (entidade === 'acoes') this.tocar('meta', 'SELECT meta_id AS id FROM meta_acao WHERE acao_id = ?', chave)
      if (entidade === 'metas') {
        this.tocar('feedback', 'SELECT id FROM feedback WHERE meta_id = ?', chave)
        this.tocar('bloco_agenda', 'SELECT id FROM bloco_agenda WHERE meta_id = ?', chave)
      }
      if (entidade === 'feedbacks') this.tocar('meta', 'SELECT id FROM meta WHERE feedback_id = ?', chave)

      this.db.prepare(`DELETE FROM ${def.tabela} WHERE ${def.coluna} = ?`).run(chave)
    })
  }

  // ---------- Apoio ----------

  /** Backup do dia (fora da transação, exigência do `VACUUM INTO`) e a escrita numa transação. */
  private escrever<T>(fn: () => T): T {
    if (this.pastaBackups) backupDoDia(this.db, this.pastaBackups, this.hoje())
    return transacao(this.db, fn)
  }

  private objeto(v: unknown): Dados {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ErroServico('invalido', 'Os dados devem ser um objeto JSON.')
    return v as Dados
  }

  private validar(def: Definicao, dados: Dados): Dados {
    const r = def.schema.safeParse(dados)
    if (!r.success) throw new ErroServico('invalido', mensagemZod(r.error))
    return r.data
  }

  private conferirVersao(def: Definicao, chave: string, atual: number, enviada: number | undefined) {
    if (enviada !== undefined && enviada !== atual) {
      throw new ErroServico('conflito', `${def.nome} ${chave} mudou desde a sua leitura (versão ${atual}, você enviou ${enviada}). Recarregue e tente de novo.`, atual)
    }
  }

  private conferirRefs(def: Definicao, dados: Dados) {
    for (const [alvo, valor, campo] of def.refs?.(dados) ?? []) {
      if (valor === null || valor === undefined) continue
      const a = ALVOS[alvo]
      const existe = this.db.prepare(`SELECT 1 FROM ${a.tabela} WHERE ${a.coluna} = ?`).get(valor as string)
      if (!existe) throw new ErroServico('invalido', `${campo}: não existe ${a.nome} ${String(valor)}.`)
    }
  }

  private tocar(tabela: string, sqlIds: string, chave: string) {
    const ids = (this.db.prepare(sqlIds).all(chave) as { id: string }[]).map((l) => l.id)
    const up = this.db.prepare(`UPDATE ${tabela} SET versao = versao + 1 WHERE id = ?`)
    for (const id of ids) up.run(id)
  }

  /**
   * Feedback ↔ meta é gravado dos dois lados ("Transformar em meta"). Ao mudar
   * o vínculo de um lado, o outro acompanha na mesma transação.
   */
  private sincronizarVinculo(entidade: Entidade, chave: string, antes: Dados | null, depois: Dados) {
    const lados = {
      metas: { campo: 'feedback', outra: 'feedback', fk: 'meta_id' },
      feedbacks: { campo: 'meta', outra: 'meta', fk: 'feedback_id' },
    } as const
    if (entidade !== 'metas' && entidade !== 'feedbacks') return
    const { campo, outra, fk } = lados[entidade]
    const anterior = (antes?.[campo] as string | null | undefined) ?? null
    const novo = (depois[campo] as string | null) ?? null
    if (anterior === novo) return

    if (anterior) {
      this.db.prepare(`UPDATE ${outra} SET ${fk} = NULL, versao = versao + 1 WHERE id = ? AND ${fk} = ?`).run(anterior, chave)
    }
    if (novo) {
      this.db.prepare(`UPDATE ${outra} SET ${fk} = ?, versao = versao + 1 WHERE id = ? AND ${fk} IS NOT ?`).run(chave, novo, chave)
    }
  }
}
