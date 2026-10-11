import { describe, expect, it } from 'vitest'
import { dataValida, diaDaSemana, gradeDoMes, inicioDaSemana, limitesDoMes, mesValido, somarDias, somarMeses } from './datas'

describe('datas de calendário', () => {
  it('soma dias atravessando mês e ano', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(somarDias('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('acha a segunda-feira da semana', () => {
    expect(diaDaSemana('2026-10-15')).toBe(4)
    expect(inicioDaSemana('2026-10-15')).toBe('2026-10-12')
    expect(inicioDaSemana('2026-10-12')).toBe('2026-10-12')
    expect(inicioDaSemana('2026-10-11')).toBe('2026-10-05') // domingo fecha a semana
  })

  it('soma meses e dá os limites do mês', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01')
    expect(somarMeses('2026-01', -1)).toBe('2025-12')
    expect(limitesDoMes('2026-02')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' })
  })

  it('monta a grade mensal em semanas completas de segunda a domingo', () => {
    const g = gradeDoMes('2026-10')
    expect(g[0]).toBe('2026-09-28')
    expect(g.at(-1)).toBe('2026-11-01')
    expect(g.length % 7).toBe(0)
  })

  it('valida datas e meses vindos da URL', () => {
    expect(dataValida('2026-10-15')).toBe(true)
    expect(dataValida('2026-02-30')).toBe(false)
    expect(dataValida('ontem')).toBe(false)
    expect(mesValido('2026-10')).toBe(true)
    expect(mesValido('2026-13')).toBe(false)
  })
})
