import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste } from './db/teste'
import { criarServidorMcp } from './mcp'
import { Servicos } from './servicos'

let cliente: Client
let servicos: Servicos

beforeEach(async () => {
  servicos = new Servicos(bancoDeTeste(), { hoje: () => '2026-10-11' })
  const [lado, outro] = InMemoryTransport.createLinkedPair()
  await criarServidorMcp(servicos, { hoje: () => '2026-10-11' }).connect(outro)
  cliente = new Client({ name: 'teste', version: '0' })
  await cliente.connect(lado)
})

async function chamar(name: string, args: Record<string, unknown> = {}) {
  const r = (await cliente.callTool({ name, arguments: args })) as CallToolResult
  const texto = r.content[0]?.type === 'text' ? r.content[0].text : ''
  return { erro: !!r.isError, texto, json: r.isError ? null : (JSON.parse(texto) as unknown) }
}

describe('servidor MCP', () => {
  it('expõe as 5 ferramentas, sem exclusão', async () => {
    const { tools } = await cliente.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(['pdi_atualizar', 'pdi_criar', 'pdi_listar', 'pdi_obter', 'pdi_resumo'])
    expect(tools.find((t) => t.name === 'pdi_criar')?.description).toContain('system-design')
  })

  it('resume o ciclo e lista com filtro e campos calculados', async () => {
    const resumo = (await chamar('pdi_resumo')).json as { kpis: { acoes: { total: number } } }
    expect(resumo.kpis.acoes.total).toBe(15)
    const acoes = (await chamar('pdi_listar', { entidade: 'acoes', filtro: { trilha: 'T1', status: 'em-revisao' } })).json as { id: string; meta: string }[]
    expect(acoes).toEqual([expect.objectContaining({ id: 'PDI-02', meta: 'M-01', progresso: 67 })])
    expect((await chamar('pdi_obter', { entidade: 'reunioes', chave: '2026-10-15' })).json).toMatchObject({ status: 'agendada', versao: 1 })
  })

  it('cria e atualiza pelos mesmos serviços do painel', async () => {
    const criada = (await chamar('pdi_criar', { entidade: 'feedbacks', dados: { reuniao: '2026-10-01', tipo: 'insight', competenciaId: 'ia', texto: 'Bom uso de IA.' } }))
      .json as { id: string; versao: number }
    expect(criada).toMatchObject({ id: 'FB-08', versao: 1 })
    expect(servicos.obter('feedbacks', 'FB-08').texto).toBe('Bom uso de IA.')

    const nova = await chamar('pdi_atualizar', { entidade: 'feedbacks', chave: 'FB-08', versao: 1, patch: { tipo: 'reconhecimento' } })
    expect(nova.json).toMatchObject({ tipo: 'reconhecimento', versao: 2 })
  })

  it('devolve erros de validação e de versão como resultado, sem gravar', async () => {
    const invalido = await chamar('pdi_criar', { entidade: 'acoes', dados: { titulo: 'X', ciclo: '2026.2', trilha: 'T1', competenciaId: 'telepatia' } })
    expect(invalido).toMatchObject({ erro: true, texto: 'competenciaId: competência desconhecida: telepatia' })

    const velho = await chamar('pdi_atualizar', { entidade: 'acoes', chave: 'PDI-01', versao: 7, patch: { status: 'concluido' } })
    expect(velho.erro).toBe(true)
    expect(velho.texto).toContain('mudou desde a sua leitura')
    expect(servicos.obter('acoes', 'PDI-01').status).toBe('em-andamento')
  })
})
