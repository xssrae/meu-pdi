import { describe, expect, it } from 'vitest'
import { carregarConfig } from './config'

describe('configuração', () => {
  it('aceita a porta do Vite configurável em desenvolvimento', () => {
    const c = carregarConfig({ PDI_VAULT_DIR: 'fixtures/vault', PDI_PORT: '5184', PDI_WEB_PORT: '5183' })
    expect(c.hostsPermitidos).toEqual(['127.0.0.1:5184', 'localhost:5184', '127.0.0.1:5183', 'localhost:5183'])
    expect(c.origensPermitidas).toContain('http://127.0.0.1:5183')
  })

  it('em produção só aceita a porta da API', () => {
    const c = carregarConfig({ PDI_VAULT_DIR: 'fixtures/vault', NODE_ENV: 'production', PDI_WEB_PORT: '5183' })
    expect(c.hostsPermitidos).toEqual(['127.0.0.1:5174', 'localhost:5174'])
  })
})
