// Migrações do esquema, aplicadas na abertura do banco conforme
// `PRAGMA user_version`. Cada uma roda numa transação; nunca edite uma
// migração já aplicada: acrescente outra no fim da lista.

import type { DatabaseSync } from 'node:sqlite'

const DATA = (c: string) => `CHECK (${c} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]')`
const HORA = (c: string) => `CHECK (${c} GLOB '[0-2][0-9]:[0-5][0-9]')`
const BOOL = (c: string) => `CHECK (${c} IN (0, 1))`

// As competências ficam no código (ADR-003): `competencia_id` é validado pelo
// Zod nos serviços, não por FK. As relações feedback ↔ meta são circulares e
// por isso adiadas para o COMMIT.
const MIGRACOES: string[] = [
  `
  CREATE TABLE ciclo (
    id          TEXT PRIMARY KEY,
    inicio      TEXT NOT NULL ${DATA('inicio')},
    fim         TEXT NOT NULL ${DATA('fim')},
    nivel_atual TEXT NOT NULL CHECK (nivel_atual IN ('junior', 'pleno', 'senior')),
    nivel_alvo  TEXT NOT NULL CHECK (nivel_alvo IN ('junior', 'pleno', 'senior')),
    versao      INTEGER NOT NULL DEFAULT 1,
    CHECK (inicio <= fim)
  );

  CREATE TABLE autoavaliacao (
    ciclo_id       TEXT NOT NULL REFERENCES ciclo (id) ON DELETE CASCADE,
    competencia_id TEXT NOT NULL,
    nivel          INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
    status         TEXT CHECK (status IN ('nao-iniciada', 'em-evolucao', 'na-meta')),
    PRIMARY KEY (ciclo_id, competencia_id)
  ) WITHOUT ROWID;

  CREATE TABLE trilha (
    id        TEXT PRIMARY KEY CHECK (id GLOB 'T[0-9]*'),
    nome      TEXT NOT NULL CHECK (nome <> ''),
    descricao TEXT NOT NULL DEFAULT '',
    cor       INTEGER NOT NULL CHECK (cor BETWEEN 1 AND 5),
    ordem     INTEGER NOT NULL,
    versao    INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE trilha_competencia (
    trilha_id      TEXT NOT NULL REFERENCES trilha (id) ON DELETE CASCADE,
    ordem          INTEGER NOT NULL,
    competencia_id TEXT NOT NULL,
    PRIMARY KEY (trilha_id, competencia_id)
  ) WITHOUT ROWID;

  CREATE TABLE acao (
    id             TEXT PRIMARY KEY CHECK (id GLOB 'PDI-[0-9][0-9]*'),
    titulo         TEXT NOT NULL CHECK (titulo <> ''),
    ciclo_id       TEXT NOT NULL REFERENCES ciclo (id) ON DELETE RESTRICT,
    trilha_id      TEXT NOT NULL REFERENCES trilha (id) ON DELETE RESTRICT,
    competencia_id TEXT NOT NULL,
    status         TEXT NOT NULL CHECK (status IN ('nao-iniciado', 'em-andamento', 'em-revisao', 'concluido')),
    prioridade     TEXT NOT NULL CHECK (prioridade IN ('alta', 'media', 'baixa')),
    prazo          TEXT ${DATA('prazo')},
    versao         INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE acao_marco (
    acao_id TEXT NOT NULL REFERENCES acao (id) ON DELETE CASCADE,
    ordem   INTEGER NOT NULL,
    texto   TEXT NOT NULL,
    feito   INTEGER NOT NULL ${BOOL('feito')},
    PRIMARY KEY (acao_id, ordem)
  ) WITHOUT ROWID;

  CREATE TABLE acao_evidencia (
    acao_id TEXT NOT NULL REFERENCES acao (id) ON DELETE CASCADE,
    ordem   INTEGER NOT NULL,
    alvo    TEXT NOT NULL,
    PRIMARY KEY (acao_id, ordem)
  ) WITHOUT ROWID;

  CREATE TABLE reuniao (
    data   TEXT PRIMARY KEY ${DATA('data')},
    inicio TEXT NOT NULL ${HORA('inicio')},
    fim    TEXT NOT NULL ${HORA('fim')},
    tema   TEXT,
    status TEXT NOT NULL CHECK (status IN ('agendada', 'realizada', 'cancelada')),
    versao INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE pauta_item (
    reuniao_data TEXT NOT NULL REFERENCES reuniao (data) ON DELETE CASCADE ON UPDATE CASCADE,
    ordem        INTEGER NOT NULL,
    texto        TEXT NOT NULL,
    feito        INTEGER NOT NULL ${BOOL('feito')},
    PRIMARY KEY (reuniao_data, ordem)
  ) WITHOUT ROWID;

  CREATE TABLE meta (
    id               TEXT PRIMARY KEY CHECK (id GLOB 'M-[0-9][0-9]*'),
    titulo           TEXT NOT NULL CHECK (titulo <> ''),
    trilha_id        TEXT NOT NULL REFERENCES trilha (id) ON DELETE RESTRICT,
    reuniao_data     TEXT NOT NULL REFERENCES reuniao (data) ON DELETE RESTRICT ON UPDATE CASCADE,
    feedback_id      TEXT REFERENCES feedback (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    criada           TEXT NOT NULL ${DATA('criada')},
    prazo            TEXT NOT NULL ${DATA('prazo')},
    progresso_manual REAL CHECK (progresso_manual BETWEEN 0 AND 100),
    concluida_em     TEXT ${DATA('concluida_em')},
    versao           INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE meta_acao (
    meta_id TEXT NOT NULL REFERENCES meta (id) ON DELETE CASCADE,
    ordem   INTEGER NOT NULL,
    acao_id TEXT NOT NULL REFERENCES acao (id) ON DELETE CASCADE,
    PRIMARY KEY (meta_id, acao_id)
  ) WITHOUT ROWID;

  CREATE TABLE feedback (
    id             TEXT PRIMARY KEY CHECK (id GLOB 'FB-[0-9][0-9]*'),
    reuniao_data   TEXT NOT NULL REFERENCES reuniao (data) ON DELETE RESTRICT ON UPDATE CASCADE,
    tipo           TEXT NOT NULL CHECK (tipo IN ('reconhecimento', 'melhoria', 'insight')),
    competencia_id TEXT NOT NULL,
    meta_id        TEXT REFERENCES meta (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    texto          TEXT NOT NULL DEFAULT '',
    versao         INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE projeto (
    id        TEXT PRIMARY KEY CHECK (id <> ''),
    projeto   TEXT NOT NULL CHECK (projeto <> ''),
    pasta     TEXT NOT NULL CHECK (pasta <> ''),
    descricao TEXT NOT NULL DEFAULT '',
    status    TEXT NOT NULL CHECK (status IN ('ativo', 'design', 'andamento', 'plano')),
    versao    INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE projeto_trilha (
    projeto_id TEXT NOT NULL REFERENCES projeto (id) ON DELETE CASCADE ON UPDATE CASCADE,
    ordem      INTEGER NOT NULL,
    trilha_id  TEXT NOT NULL REFERENCES trilha (id) ON DELETE CASCADE,
    PRIMARY KEY (projeto_id, trilha_id)
  ) WITHOUT ROWID;

  CREATE TABLE projeto_imagem (
    projeto_id TEXT NOT NULL REFERENCES projeto (id) ON DELETE CASCADE ON UPDATE CASCADE,
    ordem      INTEGER NOT NULL CHECK (ordem BETWEEN 0 AND 5),
    nome       TEXT NOT NULL,
    PRIMARY KEY (projeto_id, ordem)
  ) WITHOUT ROWID;

  CREATE TABLE projeto_evidencia (
    projeto_id TEXT NOT NULL REFERENCES projeto (id) ON DELETE CASCADE ON UPDATE CASCADE,
    ordem      INTEGER NOT NULL,
    alvo       TEXT NOT NULL,
    PRIMARY KEY (projeto_id, ordem)
  ) WITHOUT ROWID;

  CREATE TABLE bloco_agenda (
    id         TEXT PRIMARY KEY CHECK (id <> ''),
    titulo     TEXT NOT NULL CHECK (titulo <> ''),
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    inicio     TEXT NOT NULL ${HORA('inicio')},
    fim        TEXT NOT NULL ${HORA('fim')},
    de         TEXT NOT NULL ${DATA('de')},
    ate        TEXT ${DATA('ate')},
    meta_id    TEXT REFERENCES meta (id) ON DELETE SET NULL,
    versao     INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX acao_trilha ON acao (trilha_id);
  CREATE INDEX meta_acao_acao ON meta_acao (acao_id);
  CREATE INDEX feedback_reuniao ON feedback (reuniao_data);
  `,
]

/** Versão do esquema que este código espera. */
export const VERSAO_ESQUEMA = MIGRACOES.length

export function migrar(db: DatabaseSync): void {
  const { user_version: atual } = db.prepare('PRAGMA user_version').get() as { user_version: number }
  if (atual > VERSAO_ESQUEMA) {
    throw new Error(`O banco está na versão ${atual} do esquema, mais nova que a deste código (${VERSAO_ESQUEMA}). Atualize o meu-pdi.`)
  }
  for (let v = atual; v < VERSAO_ESQUEMA; v++) {
    db.exec('BEGIN IMMEDIATE')
    try {
      db.exec(MIGRACOES[v]!)
      db.exec(`PRAGMA user_version = ${v + 1}`)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
}
