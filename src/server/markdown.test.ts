import { describe, expect, it } from 'vitest'
import { checklist, ErroDeNota, h1, lerNota, secao, textoLivre, titulo, wikilinks } from './markdown'

const NOTA = `---
type: pdi-acao
id: PDI-01  # comentário preservado
status: em-andamento
extra: { mantida: true }
---
# Desenhar a arquitetura

Contexto livre.

## Marcos
- [x] Levantar requisitos
- [ ] Escrever o ADR
* [X] Revisar com a pessoa sênior
- item comum

## Evidências
- [[noctus/Architecture]]
- [[2026-09-19-editores|Sessão de 19/09]] e de novo [[noctus/Architecture]]
- ![[captura.png]]
`

describe('lerNota', () => {
  it('separa frontmatter e corpo, preservando chaves desconhecidas', () => {
    const n = lerNota(NOTA)
    expect(n.dados).toMatchObject({ id: 'PDI-01', status: 'em-andamento', extra: { mantida: true } })
    expect(n.corpo.startsWith('# Desenhar')).toBe(true)
    expect(String(n.doc)).toContain('# comentário preservado')
  })

  it('aceita CRLF e BOM', () => {
    const n = lerNota(String.fromCharCode(0xfeff) + '---\r\nid: PDI-02\r\n---\r\ncorpo')
    expect(n.dados).toEqual({ id: 'PDI-02' })
    expect(n.corpo).toBe('corpo')
  })

  it('trata nota sem frontmatter', () => {
    expect(lerNota('# Só corpo')).toMatchObject({ dados: {}, corpo: '# Só corpo', doc: null })
  })

  it('rejeita YAML inválido com mensagem legível', () => {
    expect(() => lerNota('---\nid: [aberto\n---\n')).toThrow(ErroDeNota)
    expect(() => lerNota('---\n- lista\n---\n')).toThrow(/mapa/)
  })
})

describe('corpo', () => {
  const { corpo } = lerNota(NOTA)

  it('lê H1 e título com fallback para o nome do arquivo', () => {
    expect(h1(corpo)).toBe('Desenhar a arquitetura')
    expect(titulo('sem h1', 'PDI-07 Pedir feedback a 3 pares.md')).toBe('Pedir feedback a 3 pares')
    expect(titulo('', 'M-03 - Certificação AWS.md')).toBe('Certificação AWS')
  })

  it('extrai a checklist só da seção pedida', () => {
    expect(checklist(secao(corpo, 'Marcos'))).toEqual([
      { feito: true, texto: 'Levantar requisitos' },
      { feito: false, texto: 'Escrever o ADR' },
      { feito: true, texto: 'Revisar com a pessoa sênior' },
    ])
    expect(secao(corpo, 'Inexistente')).toBe('')
  })

  it('extrai wikilinks sem alias, sem repetição e incluindo embeds', () => {
    expect(wikilinks(secao(corpo, 'evidências'))).toEqual(['noctus/Architecture', '2026-09-19-editores', 'captura.png'])
  })

  it('devolve o texto livre antes das seções', () => {
    expect(textoLivre(corpo)).toBe('Contexto livre.')
  })
})
