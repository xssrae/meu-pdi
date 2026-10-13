// Gravação de uma entidade inteira: a linha principal (upsert, sem apagar,
// para não disparar cascatas) e as tabelas filhas (apaga e regrava na ordem).
// Sem validação nem transação: quem chama (serviços, carga da semente) cuida.

import type { Acao, BlocoAgenda, Ciclo, Feedback, ItemChecklist, Meta, Projeto, Reuniao, Trilha } from '../../domain/types'
import type { Banco } from './conexao'

/** Entidade como é enviada para gravar: sem a versão, que o banco controla. */
export type SemVersao<T> = Omit<T, 'versao'>

const bool = (b: boolean) => (b ? 1 : 0)

function filhos(db: Banco, tabela: string, fk: string, id: string, colunas: string[], linhas: unknown[][]) {
  db.prepare(`DELETE FROM ${tabela} WHERE ${fk} = ?`).run(id)
  if (!linhas.length) return
  const ins = db.prepare(`INSERT INTO ${tabela} (${fk}, ordem, ${colunas.join(', ')}) VALUES (?, ?, ${colunas.map(() => '?').join(', ')})`)
  linhas.forEach((l, i) => ins.run(id, i, ...(l as (string | number | null)[])))
}

const checklist = (itens: readonly ItemChecklist[]) => itens.map((m) => [m.texto, bool(m.feito)])

export function gravarCiclo(db: Banco, c: SemVersao<Ciclo>, versao: number) {
  db.prepare(
    `INSERT INTO ciclo (id, inicio, fim, nivel_atual, nivel_alvo, versao) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET inicio = excluded.inicio, fim = excluded.fim, nivel_atual = excluded.nivel_atual,
       nivel_alvo = excluded.nivel_alvo, versao = excluded.versao`,
  ).run(c.id, c.inicio, c.fim, c.nivelAtual, c.nivelAlvo, versao)
  db.prepare('DELETE FROM autoavaliacao WHERE ciclo_id = ?').run(c.id)
  const ins = db.prepare('INSERT INTO autoavaliacao (ciclo_id, competencia_id, nivel, status) VALUES (?, ?, ?, ?)')
  for (const [comp, av] of Object.entries(c.autoavaliacao)) ins.run(c.id, comp, av.nivel, av.status)
}

export function gravarTrilha(db: Banco, t: SemVersao<Trilha>, versao: number) {
  db.prepare(
    `INSERT INTO trilha (id, nome, descricao, cor, ordem, versao) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
       ordem = excluded.ordem, versao = excluded.versao`,
  ).run(t.id, t.nome, t.descricao, t.cor, t.ordem, versao)
  filhos(db, 'trilha_competencia', 'trilha_id', t.id, ['competencia_id'], t.competencias.map((c) => [c]))
}

export function gravarAcao(db: Banco, a: SemVersao<Acao>, versao: number) {
  db.prepare(
    `INSERT INTO acao (id, titulo, ciclo_id, trilha_id, competencia_id, status, prioridade, prazo, versao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET titulo = excluded.titulo, ciclo_id = excluded.ciclo_id, trilha_id = excluded.trilha_id,
       competencia_id = excluded.competencia_id, status = excluded.status, prioridade = excluded.prioridade,
       prazo = excluded.prazo, versao = excluded.versao`,
  ).run(a.id, a.titulo, a.ciclo, a.trilha, a.competenciaId, a.status, a.prioridade, a.prazo, versao)
  filhos(db, 'acao_marco', 'acao_id', a.id, ['texto', 'feito'], checklist(a.marcos))
  filhos(db, 'acao_evidencia', 'acao_id', a.id, ['alvo'], a.evidencias.map((e) => [e]))
}

export function gravarMeta(db: Banco, m: SemVersao<Meta>, versao: number) {
  db.prepare(
    `INSERT INTO meta (id, titulo, trilha_id, reuniao_data, feedback_id, criada, prazo, progresso_manual, concluida_em, versao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET titulo = excluded.titulo, trilha_id = excluded.trilha_id, reuniao_data = excluded.reuniao_data,
       feedback_id = excluded.feedback_id, criada = excluded.criada, prazo = excluded.prazo,
       progresso_manual = excluded.progresso_manual, concluida_em = excluded.concluida_em, versao = excluded.versao`,
  ).run(m.id, m.titulo, m.trilha, m.reuniao, m.feedback, m.criada, m.prazo, m.progressoManual, m.concluidaEm, versao)
  filhos(db, 'meta_acao', 'meta_id', m.id, ['acao_id'], m.acoes.map((a) => [a]))
}

/** `dataAnterior` remarca a 1:1: o `ON UPDATE CASCADE` leva pauta, metas e feedbacks junto. */
export function gravarReuniao(db: Banco, r: SemVersao<Reuniao>, versao: number, dataAnterior?: string) {
  if (dataAnterior && dataAnterior !== r.data) db.prepare('UPDATE reuniao SET data = ? WHERE data = ?').run(r.data, dataAnterior)
  db.prepare(
    `INSERT INTO reuniao (data, inicio, fim, tema, status, versao) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (data) DO UPDATE SET inicio = excluded.inicio, fim = excluded.fim, tema = excluded.tema,
       status = excluded.status, versao = excluded.versao`,
  ).run(r.data, r.inicio, r.fim, r.tema, r.status, versao)
  filhos(db, 'pauta_item', 'reuniao_data', r.data, ['texto', 'feito'], checklist(r.pauta))
}

export function gravarFeedback(db: Banco, f: SemVersao<Feedback>, versao: number) {
  db.prepare(
    `INSERT INTO feedback (id, reuniao_data, tipo, competencia_id, meta_id, texto, versao) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET reuniao_data = excluded.reuniao_data, tipo = excluded.tipo,
       competencia_id = excluded.competencia_id, meta_id = excluded.meta_id, texto = excluded.texto, versao = excluded.versao`,
  ).run(f.id, f.reuniao, f.tipo, f.competenciaId, f.meta, f.texto, versao)
}

export function gravarProjeto(db: Banco, p: SemVersao<Projeto>, versao: number) {
  db.prepare(
    `INSERT INTO projeto (id, projeto, pasta, descricao, status, versao) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET projeto = excluded.projeto, pasta = excluded.pasta, descricao = excluded.descricao,
       status = excluded.status, versao = excluded.versao`,
  ).run(p.id, p.projeto, p.pasta, p.descricao, p.status, versao)
  filhos(db, 'projeto_trilha', 'projeto_id', p.id, ['trilha_id'], p.trilhas.map((t) => [t]))
  filhos(db, 'projeto_imagem', 'projeto_id', p.id, ['nome'], p.imagens.map((i) => [i]))
  filhos(db, 'projeto_evidencia', 'projeto_id', p.id, ['alvo'], p.evidencias.map((e) => [e]))
}

export function gravarBloco(db: Banco, b: SemVersao<BlocoAgenda>, versao: number) {
  db.prepare(
    `INSERT INTO bloco_agenda (id, titulo, dia_semana, inicio, fim, de, ate, meta_id, versao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET titulo = excluded.titulo, dia_semana = excluded.dia_semana, inicio = excluded.inicio,
       fim = excluded.fim, de = excluded.de, ate = excluded.ate, meta_id = excluded.meta_id, versao = excluded.versao`,
  ).run(b.id, b.titulo, b.diaSemana, b.inicio, b.fim, b.de, b.ate, b.meta, versao)
}
