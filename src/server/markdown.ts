// Leitura de notas Markdown do vault: frontmatter YAML, título, seções,
// checklists e wikilinks. Funções puras sobre texto, sem acesso a disco.

import { parseDocument, type Document } from 'yaml'
import type { ItemChecklist } from '../domain/types'

export interface Nota {
  /** Documento YAML preservado (comentários e chaves desconhecidas) para escrita futura. */
  doc: Document | null
  /** Frontmatter como objeto JS, ou `{}` quando a nota não tem frontmatter. */
  dados: Record<string, unknown>
  /** Conteúdo após o frontmatter. */
  corpo: string
}

export class ErroDeNota extends Error {}

const RE_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

export function lerNota(conteudo: string): Nota {
  const texto = conteudo.charCodeAt(0) === 0xfeff ? conteudo.slice(1) : conteudo
  const m = RE_FRONTMATTER.exec(texto)
  if (!m) return { doc: null, dados: {}, corpo: texto }

  const doc = parseDocument(m[1]!, { prettyErrors: false })
  if (doc.errors.length) {
    throw new ErroDeNota(`YAML inválido: ${doc.errors[0]!.message.split('\n')[0]}`)
  }
  const dados = doc.toJS() ?? {}
  if (typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroDeNota('o frontmatter precisa ser um mapa de propriedades')
  }
  return { doc, dados: dados as Record<string, unknown>, corpo: texto.slice(m[0].length) }
}

function linhas(texto: string): string[] {
  return texto.split(/\r?\n/)
}

/** Primeiro H1 do corpo, se houver. */
export function h1(corpo: string): string | null {
  for (const l of linhas(corpo)) {
    const m = /^#\s+(.+?)\s*#*\s*$/.exec(l)
    if (m) return m[1]!
  }
  return null
}

/** Título da nota: H1 ou nome do arquivo sem extensão e sem o prefixo de ID (`PDI-01 `, `M-03 `). */
export function titulo(corpo: string, nomeArquivo: string): string {
  return h1(corpo) ?? nomeArquivo.replace(/\.md$/i, '').replace(/^(PDI|M|FB|T)-?\d+\s*[-–—]?\s*/i, '').trim()
}

/** Texto de uma seção `## Nome` até a próxima seção de nível 1 ou 2. */
export function secao(corpo: string, nome: string): string {
  const alvo = nome.trim().toLowerCase()
  const saida: string[] = []
  let dentro = false
  for (const l of linhas(corpo)) {
    const cab = /^(#{1,2})\s+(.+?)\s*$/.exec(l)
    if (cab) {
      if (dentro) break
      dentro = cab[1] === '##' && cab[2]!.toLowerCase() === alvo
      continue
    }
    if (dentro) saida.push(l)
  }
  return saida.join('\n').trim()
}

/** Corpo sem o H1 e sem as seções `##`: o texto livre do começo da nota. */
export function textoLivre(corpo: string): string {
  const saida: string[] = []
  for (const l of linhas(corpo)) {
    if (/^##\s/.test(l)) break
    if (/^#\s/.test(l)) continue
    saida.push(l)
  }
  return saida.join('\n').trim()
}

/** Itens `- [ ]` / `- [x]` de um trecho de Markdown. */
export function checklist(texto: string): ItemChecklist[] {
  const itens: ItemChecklist[] = []
  for (const l of linhas(texto)) {
    const m = /^\s*[-*+]\s+\[([ xX])\]\s+(.*\S)\s*$/.exec(l)
    if (m) itens.push({ feito: m[1] !== ' ', texto: m[2]! })
  }
  return itens
}

/** Alvos de wikilink (`[[nota]]`, `[[pasta/nota|alias]]`, `![[img]]`) na ordem em que aparecem, sem repetição. */
export function wikilinks(texto: string): string[] {
  const vistos = new Set<string>()
  for (const m of texto.matchAll(/!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
    vistos.add(m[1]!.trim())
  }
  return [...vistos]
}
