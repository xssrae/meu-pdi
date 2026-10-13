// Apoio aos testes: banco em memória com a semente do protótipo
// (`tests/fixtures/pdi.json`). Cada chamada é um banco novo e isolado.

import path from 'node:path'
import { abrirBanco, type Banco } from './conexao'
import { carregarSemente, lerSemente } from './semente'

export const SEMENTE = path.resolve('tests/fixtures/pdi.json')

export function bancoDeTeste(): Banco {
  const db = abrirBanco(':memory:')
  carregarSemente(db, lerSemente(SEMENTE))
  return db
}
