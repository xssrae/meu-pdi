// Erros esperados das escritas. A API HTTP os converte em status e o MCP em
// resultado de ferramenta com `isError`; qualquer outro erro é falha interna.

import type { z } from 'zod'

export type TipoErro = 'invalido' | 'nao-encontrado' | 'conflito' | 'restricao'

export class ErroServico extends Error {
  constructor(
    readonly tipo: TipoErro,
    mensagem: string,
    /** Versão atual da entidade, num conflito de `If-Match`. */
    readonly versaoAtual?: number,
  ) {
    super(mensagem)
  }
}

export const STATUS_HTTP: Record<TipoErro, 400 | 404 | 409> = {
  invalido: 400,
  'nao-encontrado': 404,
  conflito: 409,
  restricao: 409,
}

/** Todas as falhas do Zod numa frase: `prazo: data deve estar…; trilha: …`. */
export function mensagemZod(erro: z.ZodError): string {
  return erro.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ')
}
