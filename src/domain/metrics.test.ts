import { describe, expect, it } from 'vitest'
import { COMPETENCIAS } from './framework'
import {
  competenciaPertenceATrilha,
  competenciasNaMeta,
  competenciasSemTrilha,
  contarPorStatus,
  diasEntre,
  estadoMeta,
  lacuna,
  progressoAcao,
  progressoChecklist,
  progressoMeta,
  proximoId,
  proximoStatus,
  resumoTrilha,
  statusAnterior,
  statusCompetencia,
  tempoDecorrido,
} from './metrics'
import type { Acao, StatusAcao } from './types'

function acao(id: string, status: StatusAcao, marcos: [number, number], trilha = 'T1'): Acao {
  const [feitos, total] = marcos
  return {
    id,
    versao: 1,
    titulo: id,
    ciclo: '2026.2',
    trilha,
    competenciaId: 'system-design',
    status,
    prioridade: 'media',
    prazo: null,
    marcos: Array.from({ length: total }, (_, i) => ({ texto: `m${i}`, feito: i < feitos })),
    evidencias: [],
  }
}

describe('framework', () => {
  it('tem 18 competências com slugs únicos', () => {
    expect(COMPETENCIAS).toHaveLength(18)
    expect(new Set(COMPETENCIAS.map((c) => c.id)).size).toBe(18)
  })

  it('separa 5 comportamentais, 4 de ferramentas e 9 técnicas', () => {
    const por = (p: string) => COMPETENCIAS.filter((c) => c.pilar === p).length
    expect([por('comportamental'), por('ferramentas'), por('tecnica')]).toEqual([5, 4, 9])
  })
})

describe('status de ação', () => {
  it('avança e volta na ordem do quadro', () => {
    expect(proximoStatus('nao-iniciado')).toBe('em-andamento')
    expect(proximoStatus('em-revisao')).toBe('concluido')
    expect(proximoStatus('concluido')).toBeNull()
    expect(statusAnterior('nao-iniciado')).toBeNull()
    expect(statusAnterior('concluido')).toBe('em-revisao')
  })

  it('conta ações por status', () => {
    const c = contarPorStatus([acao('PDI-01', 'concluido', [1, 1]), acao('PDI-02', 'concluido', [0, 1]), acao('PDI-03', 'em-revisao', [0, 1])])
    expect(c).toEqual({ 'nao-iniciado': 0, 'em-andamento': 0, 'em-revisao': 1, concluido: 2 })
  })

  it('resume a trilha só com as ações dela', () => {
    const r = resumoTrilha('T1', [acao('PDI-01', 'concluido', [1, 1]), acao('PDI-02', 'em-andamento', [0, 1]), acao('PDI-03', 'concluido', [1, 1], 'T2')])
    expect(r).toMatchObject({ total: 2, concluidas: 1, pct: 50 })
  })
})

describe('progresso', () => {
  it('calcula marcos e trata lista vazia', () => {
    expect(progressoChecklist([])).toEqual({ feitos: 0, total: 0, pct: 0 })
    expect(progressoChecklist([{ texto: 'a', feito: true }, { texto: 'b', feito: false }, { texto: 'c', feito: false }]).pct).toBe(33)
  })

  it('considera ação concluída como 100% mesmo com marcos abertos', () => {
    expect(progressoAcao(acao('PDI-01', 'concluido', [1, 4]))).toBe(100)
    expect(progressoAcao(acao('PDI-01', 'em-andamento', [1, 4]))).toBe(25)
  })
})

describe('competências', () => {
  it('mede a lacuna até a meta do nível-alvo', () => {
    expect(lacuna(1, 'pleno')).toBe(1)
    expect(lacuna(2, 'pleno')).toBe(0)
    expect(lacuna(4, 'pleno')).toBe(0)
    expect(lacuna(undefined, 'senior')).toBe(2)
  })

  it('usa o status manual e, sem ele, sugere pela lacuna', () => {
    expect(statusCompetencia({ nivel: 1, status: 'em-evolucao' }, 'pleno')).toBe('em-evolucao')
    expect(statusCompetencia({ nivel: 2, status: null }, 'pleno')).toBe('na-meta')
    expect(statusCompetencia(undefined, 'pleno')).toBe('nao-iniciada')
  })

  it('conta competências na meta', () => {
    const ciclo = { nivelAlvo: 'pleno' as const, autoavaliacao: { a: { nivel: 2 as const, status: null }, b: { nivel: 1 as const, status: null } } }
    expect(competenciasNaMeta(ciclo, ['a', 'b', 'c'])).toBe(1)
  })

  it('aponta competências fora de qualquer trilha', () => {
    expect(competenciasSemTrilha(['a', 'b', 'c'], [{ competencias: ['a'] }, { competencias: ['c', 'a'] }])).toEqual(['b'])
  })

  it('valida que a competência da ação pertence à trilha', () => {
    expect(competenciaPertenceATrilha('system-design', { competencias: ['system-design'] })).toBe(true)
    expect(competenciaPertenceATrilha('comunicacao', { competencias: ['system-design'] })).toBe(false)
    expect(competenciaPertenceATrilha('inexistente', { competencias: ['inexistente'] })).toBe(false)
  })
})

describe('metas', () => {
  const acoes = [acao('PDI-02', 'em-revisao', [2, 3]), acao('PDI-07', 'concluido', [3, 3])]

  it('usa progresso manual quando existe', () => {
    expect(progressoMeta({ acoes: ['PDI-02'], progressoManual: 80 }, acoes)).toBe(80)
  })

  it('faz a média do progresso das ações ligadas', () => {
    expect(progressoMeta({ acoes: ['PDI-02'], progressoManual: null }, acoes)).toBe(67)
    expect(progressoMeta({ acoes: ['PDI-02', 'PDI-07'], progressoManual: null }, acoes)).toBe(83)
    expect(progressoMeta({ acoes: [], progressoManual: null }, acoes)).toBe(0)
  })

  it('mede o tempo decorrido entre criação e prazo', () => {
    expect(diasEntre('2026-09-17', '2026-10-23')).toBe(36)
    expect(tempoDecorrido({ criada: '2026-09-17', prazo: '2026-10-23' }, '2026-10-11')).toBe(67)
    expect(tempoDecorrido({ criada: '2026-10-01', prazo: '2026-10-01' }, '2026-09-01')).toBe(100)
  })

  // Casos do design aprovado, com "hoje" = 2026-10-11.
  it.each([
    ['M-01 no ritmo', { criada: '2026-09-17', prazo: '2026-10-30', concluidaEm: null }, 67, 'no-ritmo'],
    ['M-02 em risco', { criada: '2026-09-17', prazo: '2026-10-23', concluidaEm: null }, 0, 'em-risco'],
    ['M-05 atrasada', { criada: '2026-09-03', prazo: '2026-10-09', concluidaEm: null }, 40, 'atrasada'],
    ['M-06 concluída', { criada: '2026-09-03', prazo: '2026-09-30', concluidaEm: null }, 100, 'concluida'],
    ['concluída por data', { criada: '2026-09-03', prazo: '2026-09-30', concluidaEm: '2026-09-29' }, 40, 'concluida'],
  ] as const)('%s', (_, meta, progresso, esperado) => {
    expect(estadoMeta(meta, progresso, '2026-10-11')).toBe(esperado)
  })
})

describe('IDs', () => {
  it('gera o próximo ID sequencial com dois dígitos', () => {
    expect(proximoId('PDI-', ['PDI-01', 'PDI-15', 'PDI-3'])).toBe('PDI-16')
    expect(proximoId('M-', [])).toBe('M-01')
    expect(proximoId('FB-', ['FB-07', 'M-09'])).toBe('FB-08')
  })
})
