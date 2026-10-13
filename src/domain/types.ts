// Tipos do domínio, compartilhados entre o navegador e o servidor.
// Sem dependência de React nem de Node.

export const NIVEIS = ['junior', 'pleno', 'senior'] as const
export type Nivel = (typeof NIVEIS)[number]

export const PILARES = ['comportamental', 'ferramentas', 'tecnica'] as const
export type Pilar = (typeof PILARES)[number]

/** 1–3 = Júnior/Pleno/Sênior (ou Baixo/Médio/Alto); 4 = Especialidade, só no pilar técnico. */
export type Maturidade = 1 | 2 | 3 | 4

export const STATUS_ACAO = ['nao-iniciado', 'em-andamento', 'em-revisao', 'concluido'] as const
export type StatusAcao = (typeof STATUS_ACAO)[number]

export const PRIORIDADES = ['alta', 'media', 'baixa'] as const
export type Prioridade = (typeof PRIORIDADES)[number]

export const STATUS_COMPETENCIA = ['nao-iniciada', 'em-evolucao', 'na-meta'] as const
export type StatusCompetencia = (typeof STATUS_COMPETENCIA)[number]

export const ESTADOS_META = ['no-ritmo', 'em-risco', 'atrasada', 'concluida'] as const
export type EstadoMeta = (typeof ESTADOS_META)[number]

export const TIPOS_FEEDBACK = ['reconhecimento', 'melhoria', 'insight'] as const
export type TipoFeedback = (typeof TIPOS_FEEDBACK)[number]

export const STATUS_REUNIAO = ['agendada', 'realizada', 'cancelada'] as const
export type StatusReuniao = (typeof STATUS_REUNIAO)[number]

export const STATUS_PROJETO = ['ativo', 'design', 'andamento', 'plano'] as const
export type StatusProjeto = (typeof STATUS_PROJETO)[number]

/** Índice da paleta de identidade da trilha (`trilha-1…5` no design system). */
export const CORES_TRILHA = [1, 2, 3, 4, 5] as const
export type CorTrilha = (typeof CORES_TRILHA)[number]

/** Data ISO `YYYY-MM-DD`. */
export type DataISO = string
/** Horário `HH:MM`. */
export type Hora = string

// ---------- Framework (estático, versionado no código: ADR-003) ----------

export interface Competencia {
  id: string
  pilar: Pilar
  nome: string
  /** Comportamental e ferramentas: texto esperado por nível. */
  esperado?: Record<Nivel, string>
  /** Técnica: descrição da área. */
  descricao?: string
}

export interface Persona {
  nivel: Nivel
  titulo: string
  lema: string
  perfil: string
  foco: string[]
}

// ---------- Dados da usuária (SQLite local: ADR-007) ----------

/** Metadados comuns a toda entidade gravada no banco. */
export interface Versionado {
  /** Incrementada a cada gravação (concorrência otimista: `If-Match`). */
  versao: number
}

export interface Autoavaliacao {
  nivel: Maturidade
  /** Status manual (F12). `null` = ainda não definido; a UI sugere um. */
  status: StatusCompetencia | null
}

export interface Ciclo extends Versionado {
  id: string
  inicio: DataISO
  fim: DataISO
  nivelAtual: Nivel
  nivelAlvo: Nivel
  autoavaliacao: Record<string, Autoavaliacao>
}

export interface Trilha extends Versionado {
  id: string
  nome: string
  descricao: string
  cor: CorTrilha
  ordem: number
  competencias: string[]
}

export interface ItemChecklist {
  texto: string
  feito: boolean
}

export interface Acao extends Versionado {
  id: string
  titulo: string
  ciclo: string
  trilha: string
  competenciaId: string
  status: StatusAcao
  prioridade: Prioridade
  prazo: DataISO | null
  marcos: ItemChecklist[]
  /** Nomes de nota do vault (alvos de wikilink) usados como evidência. */
  evidencias: string[]
}

export interface Meta extends Versionado {
  id: string
  titulo: string
  trilha: string
  /** Data da 1:1 de origem. */
  reuniao: DataISO
  feedback: string | null
  criada: DataISO
  prazo: DataISO
  acoes: string[]
  progressoManual: number | null
  concluidaEm: DataISO | null
}

export interface Reuniao extends Versionado {
  /** A data é o identificador da 1:1. */
  data: DataISO
  inicio: Hora
  fim: Hora
  tema: string | null
  status: StatusReuniao
  pauta: ItemChecklist[]
}

export interface Feedback extends Versionado {
  id: string
  reuniao: DataISO
  tipo: TipoFeedback
  competenciaId: string
  meta: string | null
  texto: string
}

export interface Projeto extends Versionado {
  /** Identificador curto (slug), gerado a partir do nome do projeto. */
  id: string
  /** Alvo do wikilink para a nota do projeto em `02 Projetos/`. */
  projeto: string
  pasta: string
  descricao: string
  trilhas: string[]
  status: StatusProjeto
  imagens: string[]
  evidencias: string[]
}

export interface BlocoAgenda extends Versionado {
  id: string
  titulo: string
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number
  inicio: Hora
  fim: Hora
  de: DataISO
  ate: DataISO | null
  meta: string | null
}
