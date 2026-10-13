import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { COMPETENCIAS } from '../domain/framework'
import { competenciasSemTrilha } from '../domain/metrics'
import { abrirBanco, transacao } from './db/conexao'
import { VERSAO_ESQUEMA } from './db/migracoes'
import { bancoVazio } from './db/semente'
import { bancoDeTeste } from './db/teste'
import { ErroServico } from './erros'
import { Servicos, slug } from './servicos'

let s: Servicos

beforeEach(() => {
  s = new Servicos(bancoDeTeste(), { hoje: () => '2026-10-12' })
})

function erro(fn: () => unknown): ErroServico {
  try {
    fn()
  } catch (e) {
    if (e instanceof ErroServico) return e
    throw e
  }
  throw new Error('esperava um ErroServico')
}

describe('leitura do banco com a semente', () => {
  it('lê todas as entidades do protótipo', () => {
    const d = s.repo.dados('2026-10-11')
    expect(d.ciclo?.id).toBe('2026.2')
    expect([d.trilhas, d.acoes, d.metas, d.reunioes, d.feedbacks, d.blocos].map((l) => l.length)).toEqual([5, 15, 6, 4, 7, 1])
    expect(s.repo.projetos()).toHaveLength(5)
  })

  it('converte uma ação com marcos, evidências e versão', () => {
    const a = s.obter('acoes', 'PDI-02')
    expect(a).toMatchObject({
      titulo: 'Escrever um ADR de decisão do time',
      ciclo: '2026.2',
      trilha: 'T1',
      competenciaId: 'metodologias',
      status: 'em-revisao',
      prazo: '2026-10-30',
      evidencias: ['ADR-001-spa-local-com-api-node'],
      versao: 1,
    })
    expect(a.marcos.map((m) => m.feito)).toEqual([true, true, false])
  })

  it('lê ciclo com autoavaliação, trilha com descrição e cobre todas as competências', () => {
    expect(s.repo.cicloAtual('2026-10-11')?.autoavaliacao['system-design']).toEqual({ nivel: 1, status: 'em-evolucao' })
    expect(s.obter('trilhas', 'T1')).toMatchObject({ cor: 1, ordem: 1, descricao: expect.stringContaining('visão de longo prazo') })
    expect(competenciasSemTrilha(COMPETENCIAS.map((c) => c.id), s.repo.trilhas())).toEqual([])
  })

  it('ordena IDs numericamente', () => {
    for (let i = 0; i < 85; i++) s.criar('acoes', { titulo: `A${i}`, ciclo: '2026.2', trilha: 'T2', competenciaId: 'comunicacao' })
    const ids = s.repo.acoes().map((a) => a.id)
    expect(ids.slice(-3)).toEqual(['PDI-98', 'PDI-99', 'PDI-100'])
    expect(s.criar('acoes', { titulo: 'B', ciclo: '2026.2', trilha: 'T2', competenciaId: 'comunicacao' }).id).toBe('PDI-101')
  })
})

describe('criar', () => {
  it('gera IDs e aplica os padrões', () => {
    expect(s.criar('trilhas', { nome: 'Liderança técnica', cor: 2 })).toMatchObject({ id: 'T6', ordem: 6, descricao: '', competencias: [], versao: 1 })
    expect(s.criar('metas', { titulo: 'Nova', trilha: 'T2', reuniao: '2026-10-01', prazo: '2026-12-01' })).toMatchObject({ id: 'M-07', criada: '2026-10-12' })
    expect(s.criar('projetos', { projeto: '[[Pipeline de Dados|alias]]', pasta: 'Dados' })).toMatchObject({ id: 'pipeline-de-dados', projeto: 'Pipeline de Dados' })
    expect(s.criar('projetos', { projeto: 'Pipeline de Dados', pasta: 'Dados' }).id).toBe('pipeline-de-dados-2')
  })

  it('confere referências com mensagens legíveis', () => {
    expect(erro(() => s.criar('acoes', { titulo: 'X', ciclo: '1999.1', trilha: 'T1', competenciaId: 'ia' })).message).toBe('ciclo: não existe o ciclo 1999.1.')
    expect(erro(() => s.criar('metas', { titulo: 'X', trilha: 'T1', reuniao: '2026-10-02', prazo: '2026-12-01' })).message).toBe(
      'reuniao: não existe a 1:1 de 2026-10-02.',
    )
    expect(erro(() => s.criar('metas', { titulo: 'X', trilha: 'T1', reuniao: '2026-10-01', prazo: '2026-12-01', acoes: ['PDI-77'] })).tipo).toBe('invalido')
  })

  it('recusa campos desconhecidos e chaves repetidas', () => {
    expect(erro(() => s.criar('acoes', { titulo: 'X', ciclo: '2026.2', trilha: 'T1', competenciaId: 'ia', prioriade: 'alta' })).message).toMatch(/prioriade/)
    expect(erro(() => s.criar('reunioes', { data: '2026-10-15', inicio: '09:00', fim: '10:00' })).tipo).toBe('conflito')
    expect(erro(() => s.criar('reunioes', { data: '2026-10-20', inicio: '11:00', fim: '10:00' })).message).toBe('fim: o início deve ser antes do fim')
  })

  it('"Transformar em meta": a meta e o feedback ficam ligados na mesma transação', () => {
    const fb = s.criar('feedbacks', { reuniao: '2026-10-01', tipo: 'melhoria', competenciaId: 'negociacao', texto: 'Negociar prazos.' })
    expect(fb).toMatchObject({ id: 'FB-08', meta: null })
    const m = s.criar('metas', { titulo: 'Negociar um prazo', trilha: 'T2', reuniao: '2026-10-01', feedback: fb.id, prazo: '2026-11-30' })
    expect(s.obter('feedbacks', fb.id)).toMatchObject({ meta: m.id, versao: 2 })
  })

  it('não grava nada quando a transação falha no meio', () => {
    const antes = s.repo.trilhas().length
    expect(() =>
      transacao(s.db, () => {
        s.db.prepare("INSERT INTO trilha (id, nome, cor, ordem) VALUES ('T9', 'Nova', 1, 9)").run()
        throw new Error('falha depois do INSERT')
      }),
    ).toThrow('falha depois do INSERT')
    expect(s.repo.trilhas()).toHaveLength(antes)
  })
})

describe('atualizar', () => {
  it('mescla o patch, incrementa a versão e mantém o ID', () => {
    const a = s.atualizar('acoes', 'PDI-01', 1, { status: 'concluido', marcos: [{ texto: 'Ler', feito: true }], id: 'PDI-99' })
    expect(a).toMatchObject({ id: 'PDI-01', status: 'concluido', titulo: 'Estudar padrões de system design (cap. 1 a 6)', versao: 2 })
    expect(a.marcos).toEqual([{ texto: 'Ler', feito: true }])
  })

  it('detecta conflito de versão sem gravar', () => {
    s.atualizar('acoes', 'PDI-01', 1, { prioridade: 'baixa' })
    const e = erro(() => s.atualizar('acoes', 'PDI-01', 1, { prioridade: 'alta' }))
    expect(e).toMatchObject({ tipo: 'conflito', versaoAtual: 2 })
    expect(s.obter('acoes', 'PDI-01').prioridade).toBe('baixa')
  })

  it('remarca uma 1:1 levando pauta, metas e feedbacks junto', () => {
    s.atualizar('reunioes', '2026-10-01', 1, { data: '2026-10-02' })
    expect(s.repo.reunioes().map((r) => r.data)).toContain('2026-10-02')
    expect(s.obter('reunioes', '2026-10-02').pauta.length).toBeGreaterThan(0)
    expect(s.repo.feedbacks().filter((f) => f.reuniao === '2026-10-02')).toHaveLength(3)
    expect(erro(() => s.atualizar('reunioes', '2026-10-02', 2, { data: '2026-10-15' })).tipo).toBe('conflito')
  })

  it('não troca a chave de quem não permite e altera a autoavaliação por competência', () => {
    expect(erro(() => s.atualizar('ciclos', '2026.2', 1, { id: '2027.1' })).tipo).toBe('invalido')
    const c = s.atualizar('ciclos', '2026.2', 1, { autoavaliacao: { 'system-design': { nivel: 2, status: 'na-meta' }, dados: null } })
    expect(c.autoavaliacao['system-design']).toEqual({ nivel: 2, status: 'na-meta' })
    expect(c.autoavaliacao.dados).toBeUndefined()
    expect(Object.keys(c.autoavaliacao)).toHaveLength(17)
  })

  it('trocar o feedback de uma meta desliga o anterior e liga o novo', () => {
    // M-01 ← FB-05 no protótipo; FB-06 ainda não virou meta.
    s.atualizar('metas', 'M-01', 1, { feedback: 'FB-06' })
    expect(s.obter('feedbacks', 'FB-05').meta).toBeNull()
    expect(s.obter('feedbacks', 'FB-06').meta).toBe('M-01')
  })
})

describe('excluir', () => {
  it('recusa exclusões que deixariam órfãos, com o motivo', () => {
    expect(erro(() => s.excluir('trilhas', 'T1')).message).toBe('A trilha T1 tem 4 ações e 1 meta. Exclua ou mova para outra trilha antes.')
    expect(erro(() => s.excluir('reunioes', '2026-10-01')).tipo).toBe('restricao')
    expect(erro(() => s.excluir('ciclos', '2026.2')).tipo).toBe('restricao')
  })

  it('apaga em cascata os filhos e tira a ação das metas, com versão nova', () => {
    s.excluir('acoes', 'PDI-02', 1)
    expect(s.db.prepare("SELECT count(*) AS n FROM acao_marco WHERE acao_id = 'PDI-02'").get()).toEqual({ n: 0 })
    expect(s.obter('metas', 'M-01')).toMatchObject({ acoes: [], versao: 2 })
  })

  it('excluir a meta solta o feedback e o bloco de agenda', () => {
    s.excluir('metas', 'M-03')
    expect(s.obter('feedbacks', 'FB-07')).toMatchObject({ meta: null, versao: 2 })
    expect(s.obter('blocos', 'estudo-aws').meta).toBeNull()
  })

  it('confere a versão quando informada', () => {
    expect(erro(() => s.excluir('feedbacks', 'FB-01', 9)).tipo).toBe('conflito')
    expect(erro(() => s.excluir('feedbacks', 'FB-99')).tipo).toBe('nao-encontrado')
  })
})

describe('banco', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'meu-pdi-'))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('cria o arquivo, aplica as migrações e liga as FKs', () => {
    const db = abrirBanco(path.join(dir, 'sub', 'pdi.db'))
    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: VERSAO_ESQUEMA })
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 })
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
    expect(bancoVazio(db)).toBe(true)
    db.close()
  })

  it('recusa um banco de esquema mais novo que o código', () => {
    const arq = path.join(dir, 'novo.db')
    const db = new DatabaseSync(arq)
    db.exec(`PRAGMA user_version = ${VERSAO_ESQUEMA + 1}`)
    db.close()
    expect(() => abrirBanco(arq)).toThrow(/mais nova/)
  })

  it('faz um backup por dia na primeira escrita e mantém os 14 mais recentes', () => {
    const backups = path.join(dir, 'backups')
    const db = abrirBanco(path.join(dir, 'pdi.db'))
    let dia = '2026-10-01'
    const sv = new Servicos(db, { hoje: () => dia, pastaBackups: backups })
    sv.criar('ciclos', { id: '2026.2', inicio: '2026-07-01', fim: '2026-12-31', nivelAtual: 'junior', nivelAlvo: 'pleno' })
    sv.criar('trilhas', { nome: 'T', cor: 1 })
    expect(readdirSync(backups)).toEqual(['pdi-2026-10-01.db'])

    for (let d = 2; d <= 16; d++) {
      dia = `2026-10-${String(d).padStart(2, '0')}`
      sv.atualizar('trilhas', 'T1', undefined, { nome: `T ${d}` })
    }
    const nomes = readdirSync(backups).sort()
    expect(nomes).toHaveLength(14)
    expect(nomes[0]).toBe('pdi-2026-10-03.db')
    expect(existsSync(path.join(backups, 'pdi-2026-10-16.db'))).toBe(true)
    db.close()
  })
})

describe('slug', () => {
  it('normaliza acentos e evita repetição', () => {
    expect(slug('Ação & Reação: v2!', [])).toBe('acao-reacao-v2')
    expect(slug('Ação', ['acao', 'acao-2'])).toBe('acao-3')
    expect(slug('!!!', [])).toBe('item')
  })
})
