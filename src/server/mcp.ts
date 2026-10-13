// Servidor MCP do PDI (ADR-007): o canal dos agentes de IA, no lugar das
// notas Markdown. As ferramentas chamam os mesmos serviços da API HTTP, então
// a validação, os IDs e a concorrência são iguais aos do painel. Excluir fica
// só no painel, com confirmação.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { montarResumo, vistaAcoes, vistaMetas } from '../domain/aggregates'
import { COMPETENCIAS } from '../domain/framework'
import { hojeISO } from '../domain/metrics'
import { ErroServico } from './erros'
import { ENTIDADES, type Entidade, type Servicos } from './servicos'

const CAMPOS = `Campos por entidade (datas AAAA-MM-DD, horários HH:MM):
- ciclos: id ("2026.2", escolhido por você), inicio, fim, nivelAtual e nivelAlvo (junior|pleno|senior), autoavaliacao { competenciaId: { nivel 1-4, status nao-iniciada|em-evolucao|na-meta|null } }. No patch, a autoavaliação altera só as competências enviadas; null remove uma.
- trilhas: nome, descricao, cor (1-5), ordem, competencias [competenciaId]. ID T1, T2… gerado.
- acoes: titulo, ciclo (id do ciclo), trilha (T1…), competenciaId, status (nao-iniciado|em-andamento|em-revisao|concluido), prioridade (alta|media|baixa), prazo, marcos [{ texto, feito }], evidencias [nome de nota do vault]. ID PDI-NN gerado.
- metas: titulo, trilha, reuniao (data da 1:1 de origem), feedback (FB-NN ou null), criada (padrão: hoje), prazo, acoes [PDI-NN], progressoManual (0-100 ou null), concluidaEm. ID M-NN gerado. Ligar a um feedback atualiza o feedback também.
- reunioes: data (é a chave; mudar remarca a 1:1), inicio, fim, tema, status (agendada|realizada|cancelada), pauta [{ texto, feito }].
- feedbacks: reuniao (data de uma 1:1 existente), tipo (reconhecimento|melhoria|insight), competenciaId, meta (M-NN ou null), texto. ID FB-NN gerado.
- projetos: projeto (nome da nota em 02 Projetos/), pasta, descricao, trilhas [T1…], status (ativo|design|andamento|plano), evidencias. ID gerado do nome.
- blocos (estudo recorrente na agenda): titulo, diaSemana (0 = domingo … 6 = sábado), inicio, fim, de, ate, meta.
IDs de competência: ${COMPETENCIAS.map((c) => c.id).join(', ')}.`

const entidade = z.enum(ENTIDADES).describe('Tipo de registro do PDI')
const chave = z.string().min(1).describe('ID da entidade (PDI-01, M-02, FB-03, T1, 2026.2) ou a data AAAA-MM-DD de uma 1:1')

function ok(valor: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(valor, null, 2) }] }
}

/** Erros esperados voltam como resultado com `isError`, para o agente corrigir e tentar de novo. */
function executar(fn: () => unknown): CallToolResult {
  try {
    return ok(fn())
  } catch (e) {
    if (e instanceof ErroServico) return { isError: true, content: [{ type: 'text', text: e.message }] }
    throw e
  }
}

export function criarServidorMcp(servicos: Servicos, opts: { hoje?: () => string } = {}): McpServer {
  const hoje = opts.hoje ?? (() => hojeISO())
  const repo = servicos.repo
  const servidor = new McpServer({ name: 'meu-pdi', version: '0.1.0' })

  /** Ações e metas saem com os campos calculados do painel (progresso, meta, estado). */
  const listar = (e: Entidade) => {
    if (e === 'acoes') return vistaAcoes(repo.acoes(), repo.metas())
    if (e === 'metas') return vistaMetas(repo.metas(), repo.acoes(), hoje())
    return servicos.listar(e)
  }

  servidor.registerTool(
    'pdi_resumo',
    {
      title: 'Resumo do PDI',
      description: 'Visão geral do ciclo atual: KPIs, status por trilha, próxima 1:1 com metas para revisar, prazos próximos e últimos feedbacks.',
      annotations: { readOnlyHint: true },
    },
    () => executar(() => montarResumo(repo.dados(hoje()), hoje())),
  )

  servidor.registerTool(
    'pdi_listar',
    {
      title: 'Listar registros do PDI',
      description:
        'Lista todos os registros de uma entidade, com a `versao` de cada um (exigida por pdi_atualizar). `filtro` compara campos por igualdade, ex.: { "trilha": "T1", "status": "em-andamento" }.',
      inputSchema: { entidade, filtro: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional() },
      annotations: { readOnlyHint: true },
    },
    ({ entidade, filtro }) =>
      executar(() => {
        const itens = listar(entidade) as unknown as Record<string, unknown>[]
        return filtro ? itens.filter((i) => Object.entries(filtro).every(([k, v]) => i[k] === v)) : itens
      }),
  )

  servidor.registerTool(
    'pdi_obter',
    {
      title: 'Obter um registro do PDI',
      description: 'Um registro pelo ID (ou pela data, para reunioes), com a `versao` atual.',
      inputSchema: { entidade, chave },
      annotations: { readOnlyHint: true },
    },
    ({ entidade, chave }) =>
      executar(() => {
        const encontrado = (listar(entidade) as unknown as Record<string, unknown>[]).find((i) => (entidade === 'reunioes' ? i.data : i.id) === chave)
        return encontrado ?? servicos.obter(entidade, chave)
      }),
  )

  servidor.registerTool(
    'pdi_criar',
    {
      title: 'Criar um registro no PDI',
      description: `Cria um registro e devolve o registro gravado, com o ID gerado. Campos omitidos usam o padrão.\n\n${CAMPOS}`,
      inputSchema: { entidade, dados: z.record(z.string(), z.unknown()).describe('Campos do registro') },
    },
    ({ entidade, dados }) => executar(() => servicos.criar(entidade, dados)),
  )

  servidor.registerTool(
    'pdi_atualizar',
    {
      title: 'Atualizar um registro do PDI',
      description: `Altera só os campos enviados em \`patch\` (listas são substituídas inteiras: envie todos os marcos, por exemplo). Exige a \`versao\` lida em pdi_obter ou pdi_listar; se o registro mudou depois disso, devolve erro e nada é gravado.\n\n${CAMPOS}`,
      inputSchema: {
        entidade,
        chave,
        versao: z.number().int().positive().describe('Versão lida do registro'),
        patch: z.record(z.string(), z.unknown()).describe('Campos a alterar'),
      },
      annotations: { idempotentHint: true },
    },
    ({ entidade, chave, versao, patch }) => executar(() => servicos.atualizar(entidade, chave, versao, patch)),
  )

  return servidor
}
