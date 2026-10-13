// Entrada do servidor MCP por stdio (`npm run mcp`). O cliente (Claude Code
// no vault, por exemplo) inicia este processo com outra pasta de trabalho,
// então tudo é resolvido a partir da raiz do repositório. Nada pode ir para
// o stdout além do protocolo: logs vão para o stderr.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { fileURLToPath } from 'node:url'
import { carregarConfig } from './config'
import { abrirBanco } from './db/conexao'
import { Servicos } from './servicos'
import { criarServidorMcp } from './mcp'

process.chdir(fileURLToPath(new URL('../..', import.meta.url)))

const config = carregarConfig()
if (config.db === ':memory:') throw new Error('O MCP precisa do mesmo arquivo do painel: defina PDI_DB com um caminho, não :memory:.')

const db = abrirBanco(config.db)
const hoje = config.hojeFixo ? () => config.hojeFixo! : undefined
const servidor = criarServidorMcp(new Servicos(db, { hoje, pastaBackups: config.pastaBackups }), { hoje })

await servidor.connect(new StdioServerTransport())
console.error(`meu-pdi MCP pronto · banco em ${config.db}`)

process.stdin.once('close', () => db.close())
