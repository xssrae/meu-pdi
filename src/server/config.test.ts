import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { carregarConfig } from './config'

describe('configuração', () => {
  it('aceita a porta do Vite configurável em desenvolvimento', () => {
    const c = carregarConfig({ PDI_PORT: '5184', PDI_WEB_PORT: '5183' })
    expect(c.hostsPermitidos).toEqual(['127.0.0.1:5184', 'localhost:5184', '127.0.0.1:5183', 'localhost:5183'])
    expect(c.origensPermitidas).toContain('http://127.0.0.1:5183')
  })

  it('em produção só aceita a porta da API', () => {
    const c = carregarConfig({ NODE_ENV: 'production', PDI_WEB_PORT: '5183' })
    expect(c.hostsPermitidos).toEqual(['127.0.0.1:5174', 'localhost:5174'])
  })

  it('usa data/pdi.db por padrão, com os backups ao lado', () => {
    const c = carregarConfig({})
    expect(c.db).toBe(path.resolve('data/pdi.db'))
    expect(c.pastaBackups).toBe(path.resolve('data/backups'))
    expect(c.semente).toBeNull()
  })

  it('banco em memória não tem backup', () => {
    const c = carregarConfig({ PDI_DB: ':memory:', PDI_SEMENTE: 'tests/fixtures/pdi.json' })
    expect(c).toMatchObject({ db: ':memory:', pastaBackups: null, semente: path.resolve('tests/fixtures/pdi.json') })
  })
})
