// Framework de competências e personas (ADR-003).
// Fonte: nota "Carreira em Engenharia de Software" do vault
// (03 Areas/Carreira/Carreira em Engenharia de Software.md), transcrita em 2026-10-08.
// Os slugs são IDs estáveis: renomear um exige migrar as notas do PDI.

import type { Competencia, Maturidade, Nivel, Persona, Pilar } from './types'

export const NOME_NIVEL: Record<Nivel, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
}

export const NOME_PILAR: Record<Pilar, string> = {
  comportamental: 'Comportamental',
  ferramentas: 'Ferramentas',
  tecnica: 'Técnica',
}

/** Rótulos da escala de maturidade por pilar (o técnico tem Especialidade). */
export const ESCALA: Record<Pilar, readonly string[]> = {
  comportamental: ['Júnior', 'Pleno', 'Sênior'],
  ferramentas: ['Júnior', 'Pleno', 'Sênior'],
  tecnica: ['Baixo', 'Médio', 'Alto', 'Especialidade'],
}

export function maturidadeMaxima(pilar: Pilar): Maturidade {
  return pilar === 'tecnica' ? 4 : 3
}

export const COMPETENCIAS: readonly Competencia[] = [
  // Habilidades comportamentais
  {
    id: 'planejamento-execucao',
    pilar: 'comportamental',
    nome: 'Planejamento e execução',
    esperado: {
      junior: 'Entende objetivos e prioridades; planeja tarefas de curto prazo; cumpre prazos com suporte',
      pleno: 'Planeja entregas end-to-end; prioriza o que gera mais valor; adapta planos frente a mudanças',
      senior: 'Define e desdobra objetivos do time; equilibra curto e longo prazo; garante execução consistente em cenários complexos',
    },
  },
  {
    id: 'comunicacao',
    pilar: 'comportamental',
    nome: 'Comunicação',
    esperado: {
      junior: 'Comunica ideias de forma clara; escuta ativamente; documenta e compartilha conhecimento',
      pleno: 'Comunica em diferentes públicos; argumenta com dados e contexto; facilita alinhamento entre áreas',
      senior: 'Influencia e inspira com clareza; comunica visão e estratégia; sabe dar e receber feedback com empatia',
    },
  },
  {
    id: 'geracao-valor',
    pilar: 'comportamental',
    nome: 'Geração de valor',
    esperado: {
      junior: 'Entende o contexto do negócio; contribui com entregas de valor; mede resultados simples',
      pleno: 'Conecta trabalho ao resultado de negócio; propõe melhorias e oportunidades; mensura e comunica impacto',
      senior: 'Identifica oportunidades estratégicas; impulsiona iniciativas de alto impacto; comunica e defende valor com dados e narrativa',
    },
  },
  {
    id: 'negociacao',
    pilar: 'comportamental',
    nome: 'Negociação',
    esperado: {
      junior: 'Entende diferentes pontos de vista; busca acordos simples; escala conflitos quando necessário',
      pleno: 'Negocia prioridades e trade-offs; equilibra interesses técnicos e de negócio; constrói acordos sustentáveis',
      senior: 'Negocia em cenários complexos e ambíguos; alinha múltiplos stakeholders; constrói relacionamentos de confiança de longo prazo',
    },
  },
  {
    id: 'mobilizacao',
    pilar: 'comportamental',
    nome: 'Mobilização e influência',
    esperado: {
      junior: 'Colabora com o time; é proativo e solicita ajuda; contribui para um ambiente positivo',
      pleno: 'Mobiliza pessoas para objetivos comuns; compartilha conhecimento ativamente; contribui para a cultura do time',
      senior: 'Forma e desenvolve pessoas; influencia sem autoridade formal; impulsiona uma cultura de alto desempenho',
    },
  },
  // Ferramentas e organizacional
  {
    id: 'metodos-trabalho',
    pilar: 'ferramentas',
    nome: 'Métodos de trabalho',
    esperado: {
      junior: 'Entende o funcionamento do time; participa das cerimônias; entrega tarefas do sprint',
      pleno: 'Planeja e estima entregas; contribui para melhoria contínua; ajuda na priorização do backlog',
      senior: 'Facilita cerimônias quando necessário; melhora processos e fluxo de valor; ajuda na definição de estratégia do time',
    },
  },
  {
    id: 'gestao-produto',
    pilar: 'ferramentas',
    nome: 'Gestão de produto e negócio',
    esperado: {
      junior: 'Entende o produto e os usuários; compreende métricas básicas; contribui com visão do cliente',
      pleno: 'Conecta entrega às métricas de negócio; colabora com Product e outras áreas; sugere melhorias baseadas em dados',
      senior: 'Influencia roadmap e estratégia de produto; ajuda na descoberta e validação de soluções; atua com visão sistêmica do negócio',
    },
  },
  {
    id: 'ia',
    pilar: 'ferramentas',
    nome: 'Ferramentas de IA',
    esperado: {
      junior: 'Utiliza IA para aumentar produtividade; aplica em tarefas do dia a dia; avalia criticamente os resultados',
      pleno: 'Integra IA no fluxo de trabalho; cria automações e assistentes; compartilha boas práticas no time',
      senior: 'Explora novas aplicações de IA; define diretrizes e uso responsável; multiplica conhecimento e impulsiona adoção',
    },
  },
  {
    id: 'colaboracao',
    pilar: 'ferramentas',
    nome: 'Colaboração e ecossistema',
    esperado: {
      junior: 'Usa ferramentas do time (GitHub, Jira etc.); colabora de forma efetiva; segue padrões e convenções',
      pleno: 'Integra diferentes ferramentas no fluxo; contribui para padronização e automação; compartilha conhecimento e documentação',
      senior: 'Define e evolui o ecossistema de ferramentas; garante adoção e boas práticas; avalia novas ferramentas e seu impacto',
    },
  },
  // Habilidades técnicas
  { id: 'codificacao', pilar: 'tecnica', nome: 'Codificação', descricao: 'Desenvolvimento de software limpo, legível e manutenível' },
  { id: 'system-design', pilar: 'tecnica', nome: 'System Design', descricao: 'Projeto de sistemas escaláveis, performáticos e sustentáveis' },
  { id: 'observabilidade', pilar: 'tecnica', nome: 'Observabilidade', descricao: 'Visibilidade, monitoramento e diagnóstico em produção' },
  { id: 'qualidade', pilar: 'tecnica', nome: 'Qualidade', descricao: 'Testes, revisão de código e garantia da qualidade' },
  { id: 'infraestrutura', pilar: 'tecnica', nome: 'Infraestrutura', descricao: 'Provisionamento, operação e gestão de ambientes' },
  { id: 'resiliencia', pilar: 'tecnica', nome: 'Resiliência', descricao: 'Construção de sistemas tolerantes a falhas e com capacidade de recuperação' },
  { id: 'seguranca', pilar: 'tecnica', nome: 'Segurança', descricao: 'Desenvolvimento e operação de sistemas seguros' },
  { id: 'dados', pilar: 'tecnica', nome: 'Dados', descricao: 'Trabalho com dados, integração e análise para gerar valor' },
  {
    id: 'metodologias',
    pilar: 'tecnica',
    nome: 'Metodologias e processos técnicos',
    descricao: 'Práticas técnicas, padrões, arquitetura e melhoria contínua',
  },
]

const POR_ID = new Map(COMPETENCIAS.map((c) => [c.id, c]))

export function competencia(id: string): Competencia | undefined {
  return POR_ID.get(id)
}

export function isCompetenciaId(id: string): boolean {
  return POR_ID.has(id)
}

export const PERSONAS: readonly Persona[] = [
  {
    nivel: 'junior',
    titulo: 'Analista Júnior',
    lema: 'Quero aprender, contribuir e evoluir com o apoio do time.',
    perfil:
      'Em início de carreira, com foco em aprender fundamentos, executar tarefas com qualidade e construir autonomia gradualmente.',
    foco: [
      'Aprofundar fundamentos técnicos',
      'Ganhar autonomia na resolução de problemas',
      'Melhorar comunicação e organização pessoal',
      'Entender melhor o contexto de negócio',
    ],
  },
  {
    nivel: 'pleno',
    titulo: 'Analista Pleno',
    lema: 'Consigo resolver problemas, contribuir com o time e gerar valor consistente.',
    perfil:
      'Profissional com autonomia para entregar soluções de ponta a ponta, que contribui ativamente com o time e começa a influenciar o produto.',
    foco: [
      'Evoluir em system design e arquitetura',
      'Aumentar visão de negócio e impacto das soluções',
      'Desenvolver habilidades de negociação e influência',
      'Assumir mais protagonismo técnico',
    ],
  },
  {
    nivel: 'senior',
    titulo: 'Analista Sênior',
    lema: 'Transformo problemas complexos em soluções sustentáveis, gerando alto impacto para o time e o negócio.',
    perfil:
      'Referência técnica e comportamental, lidera pelo exemplo, executa soluções complexas e de alto impacto, influencia decisões estratégicas e desenvolve outras pessoas.',
    foco: [
      'Aprofundar liderança técnica e influência',
      'Fortalecer visão de negócio e geração de valor',
      'Desenvolver pessoas e multiplicar conhecimento',
      'Explorar especialização em áreas de interesse (ex.: arquitetura, IA, segurança, performance, dados)',
    ],
  },
]
