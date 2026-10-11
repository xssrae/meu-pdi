import { cp, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { COMPETENCIAS } from '../domain/framework'
import { competenciasSemTrilha } from '../domain/metrics'
import { VaultRepository } from './vault-repository'

const FIXTURE = path.resolve('fixtures/vault/PDI')

describe('VaultRepository com o vault de fixture', () => {
  const repo = new VaultRepository(FIXTURE)

  it('lê todas as entidades sem erros', async () => {
    const { dados, erros } = await repo.dados('2026-10-11')
    expect(erros).toEqual([])
    expect(dados.ciclo?.id).toBe('2026.2')
    expect(dados.trilhas).toHaveLength(5)
    expect(dados.acoes).toHaveLength(15)
    expect(dados.metas).toHaveLength(6)
    expect(dados.reunioes).toHaveLength(4)
    expect(dados.feedbacks).toHaveLength(7)
    expect(dados.blocos).toHaveLength(1)
    expect((await repo.projetos()).itens).toHaveLength(5)
  })

  it('converte uma ação com marcos, evidências e versão', async () => {
    const a = (await repo.acoes()).itens.find((x) => x.id === 'PDI-02')!
    expect(a).toMatchObject({
      titulo: 'Escrever um ADR de decisão do time',
      ciclo: '2026.2',
      trilha: 'T1',
      competenciaId: 'metodologias',
      status: 'em-revisao',
      prazo: '2026-10-30',
      evidencias: ['ADR-001-spa-local-com-api-node'],
    })
    expect(a.marcos.map((m) => m.feito)).toEqual([true, true, false])
    expect(a.versao).toMatch(/^[0-9a-f]{40}$/)
    expect(a.arquivo).toBe('Acoes/PDI-02 Escrever um ADR de decisão do time.md')
  })

  it('lê ciclo com autoavaliação e trilha com descrição', async () => {
    const c = await repo.cicloAtual('2026-10-11')
    expect(c).toMatchObject({ nivelAtual: 'junior', nivelAlvo: 'pleno' })
    expect(c?.autoavaliacao['system-design']).toEqual({ nivel: 1, status: 'em-evolucao' })
    const t1 = (await repo.trilhas()).itens.find((t) => t.id === 'T1')!
    expect(t1).toMatchObject({ cor: 1, ordem: 1, descricao: expect.stringContaining('visão de longo prazo') })
  })

  it('cobre todas as competências com as trilhas de exemplo', async () => {
    const { itens } = await repo.trilhas()
    expect(competenciasSemTrilha(COMPETENCIAS.map((c) => c.id), itens)).toEqual([])
  })

  it('lê pauta da 1:1, feedback e projeto', async () => {
    const r = (await repo.reunioes()).itens.find((x) => x.data === '2026-10-15')!
    expect(r).toMatchObject({ status: 'agendada', inicio: '10:00', fim: '10:45' })
    expect(r.pauta).toHaveLength(4)
    const f = (await repo.feedbacks()).itens.find((x) => x.id === 'FB-04')!
    expect(f).toMatchObject({ tipo: 'melhoria', competenciaId: 'comunicacao', meta: 'M-02', texto: expect.stringContaining('reviews') })
    const p = (await repo.projetos()).itens.find((x) => x.id === 'noctus')!
    expect(p).toMatchObject({ projeto: 'noctus', pasta: 'Arquitetura e cloud', descricao: 'Pipeline assíncrono de detecção de fraude com Kafka, Java e Lambda.', trilhas: ['T1', 'T5'], evidencias: ['noctus/Architecture'] })
  })
})

describe('VaultRepository com arquivos problemáticos', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'meu-pdi-'))
    await cp(FIXTURE, dir, { recursive: true })
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('retorna lista vazia para pasta inexistente', async () => {
    await rm(path.join(dir, 'Agenda'), { recursive: true })
    expect(await new VaultRepository(dir).blocos()).toEqual({ itens: [], erros: [] })
  })

  it('isola YAML inválido e campos errados sem derrubar a lista', async () => {
    await writeFile(path.join(dir, 'Acoes', 'PDI-90 Quebrada.md'), '---\nid: [PDI-90\n---\n')
    await writeFile(
      path.join(dir, 'Acoes', 'PDI-91 Status errado.md'),
      '---\nid: PDI-91\nciclo: "2026.2"\ntrilha: T1\ncompetencia: system-design\nstatus: pronto\n---\n',
    )
    await writeFile(
      path.join(dir, 'Acoes', 'PDI-92 Competência errada.md'),
      '---\nid: PDI-92\nciclo: "2026.2"\ntrilha: T1\ncompetencia: telepatia\nstatus: concluido\n---\n',
    )
    const { itens, erros } = await new VaultRepository(dir).acoes()
    expect(itens).toHaveLength(15)
    expect(erros).toEqual([
      { arquivo: 'Acoes/PDI-90 Quebrada.md', mensagem: expect.stringMatching(/^YAML inválido/) },
      { arquivo: 'Acoes/PDI-91 Status errado.md', mensagem: expect.stringMatching(/^status:/) },
      { arquivo: 'Acoes/PDI-92 Competência errada.md', mensagem: 'competencia: competência desconhecida: telepatia' },
    ])
  })

  it('aponta ID duplicado e mantém o primeiro arquivo', async () => {
    await writeFile(
      path.join(dir, 'Acoes', 'PDI-01 zz cópia.md'),
      '---\nid: PDI-01\nciclo: "2026.2"\ntrilha: T1\ncompetencia: system-design\nstatus: concluido\n---\n',
    )
    const { itens, erros } = await new VaultRepository(dir).acoes()
    expect(itens.filter((a) => a.id === 'PDI-01')).toHaveLength(1)
    expect(itens.find((a) => a.id === 'PDI-01')?.status).toBe('em-andamento')
    expect(erros).toEqual([{ arquivo: 'Acoes/PDI-01 zz cópia.md', mensagem: expect.stringContaining('duplicado') }])
  })

  it('relê o arquivo quando ele muda no disco (edição no Obsidian)', async () => {
    const repo = new VaultRepository(dir)
    const arq = path.join(dir, 'Feedbacks', 'FB-01.md')
    const antes = (await repo.feedbacks()).itens.find((f) => f.id === 'FB-01')!
    await writeFile(arq, '---\nid: FB-01\nreuniao: 2026-10-01\ntipo: reconhecimento\ncompetencia: comunicacao\n---\nTexto novo.')
    const futuro = new Date(Date.now() + 5000)
    await utimes(arq, futuro, futuro)
    const depois = (await repo.feedbacks()).itens.find((f) => f.id === 'FB-01')!
    expect(depois.tipo).toBe('reconhecimento')
    expect(depois.texto).toBe('Texto novo.')
    expect(depois.versao).not.toBe(antes.versao)
  })
})
