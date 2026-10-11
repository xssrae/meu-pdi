// Catálogo vivo do design system (só em desenvolvimento). Reproduz o artboard
// "Fundamentos" com os componentes reais e é o alvo dos testes visuais e de
// acessibilidade do Playwright. Valores hex são lidos dos tokens em runtime.

import { CalendarCheck, ChartColumn, CircleHelp, FileCheck, Folder, LayoutDashboard, MessageSquare, Plus, Route, SlidersHorizontal, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ESTADOS_META, PRIORIDADES, STATUS_ACAO, STATUS_COMPETENCIA, TIPOS_FEEDBACK, type Maturidade } from '../../domain/types'
import { ActionCard } from '../components/ActionCard'
import { Button, IconButton } from '../components/Button'
import { CalendarEvent } from '../components/CalendarEvent'
import { Donut } from '../components/charts/Donut'
import { ProgressTime } from '../components/charts/ProgressTime'
import { SegmentBar } from '../components/charts/SegmentBar'
import { cn } from '../components/cn'
import { FilterChips } from '../components/FilterChips'
import { FolderCard } from '../components/FolderCard'
import { KpiCell } from '../components/KpiCell'
import { LevelDots } from '../components/LevelDots'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { StatusPill } from '../components/StatusPill'
import { ToastVisual } from '../components/Toast'
import { useToast } from '../components/toast-context'
import { TOM_STATUS_ACAO, TOM_TRILHA, tomPasta } from '../components/tones'
import { Sidebar } from '../layout/Sidebar'

interface Cor {
  nome: string
  token: string
  classe: string
  /** Classe de texto para a amostra "Aa" sobre a cor. */
  amostra?: string
}

const c = (nome: string, token: string, classe: string, amostra?: string): Cor => ({ nome, token, classe, amostra })

const GRUPOS_COR: { titulo: string; uso: string; cores: Cor[] }[] = [
  {
    titulo: 'Superfícies e texto',
    uso: 'Fundo quente em camadas; tinta quase preta.',
    cores: [
      c('Fundo', 'bg-ground', 'bg-ground'),
      c('Shell', 'bg-shell', 'bg-shell'),
      c('Painel', 'bg-panel', 'bg-panel'),
      c('Card', 'bg-card', 'bg-card'),
      c('Borda', 'border', 'bg-line'),
      c('Borda forte', 'border-strong', 'bg-line-strong'),
      c('Borda sutil', 'border-subtle', 'bg-line-subtle'),
      c('Divisória', 'divider', 'bg-divider'),
      c('Tinta', 'text-1', 'bg-ink', 'text-on-ink'),
      c('Texto 2', 'text-2', 'bg-ink-2', 'text-on-ink'),
      c('Texto 3', 'text-3', 'bg-ink-3', 'text-on-ink'),
    ],
  },
  {
    titulo: 'Acento e alerta',
    uso: 'Sálvia para progresso e marca; vermelho só para "hoje" e atraso.',
    cores: [c('Acento', 'accent', 'bg-accent', 'text-on-ink'), c('Acento escuro', 'accent-strong', 'bg-accent-strong', 'text-on-ink'), c('Hoje / alerta', 'alert', 'bg-alert', 'text-on-ink')],
  },
  {
    titulo: 'Status de ação',
    uso: 'Quadro e gráficos. Série validada para daltonismo.',
    cores: [
      c('Não iniciado', 'status-todo', 'bg-status-todo-bg', 'text-status-todo-fg'),
      c('Em andamento', 'status-doing', 'bg-status-doing-bg', 'text-status-doing-fg'),
      c('Em revisão', 'status-review', 'bg-status-review-bg', 'text-status-review-fg'),
      c('Concluído', 'status-done', 'bg-status-done-bg', 'text-status-done-fg'),
      c('Série 1', 'chart-todo', 'bg-chart-todo'),
      c('Série 2', 'chart-doing', 'bg-chart-doing'),
      c('Série 3', 'chart-review', 'bg-chart-review'),
      c('Série 4', 'chart-done', 'bg-chart-done'),
    ],
  },
  {
    titulo: 'Trilhas',
    uso: 'Identidade de cada trilha: tom 1 (corpo), tom 2 (aba) e texto.',
    cores: [1, 2, 3, 4, 5].map((n) => c(`T${n}`, `trilha-${n}`, TOM_TRILHA[n as 1].bg, TOM_TRILHA[n as 1].fg)),
  },
  {
    titulo: 'Pilar',
    uso: 'Ponto do pilar nas competências.',
    cores: [c('Comportamental', 'pilar-comp', 'bg-pilar-comp'), c('Ferramentas', 'pilar-ferr', 'bg-pilar-ferr'), c('Técnica', 'pilar-tec', 'bg-pilar-tec', 'text-on-ink')],
  },
]

const TIPOS = [
  ['type-display', 'Geist 40/700 −2%', 'Fundamentos'],
  ['type-h1', 'Geist 28/700 −2%', 'Trilhas de carreira'],
  ['type-h2', 'Geist 18/600', 'Status por trilha'],
  ['type-title', 'Geist 15/600', 'Escrever um ADR de decisão do time'],
  ['type-body', 'Geist 14/400 · 1.5', 'Metas combinadas em cada 1:1 com a coordenadora.'],
  ['type-small', 'Geist 13/400', 'Comunicação e Influência'],
  ['type-caption', 'Geist 12/400', '3 de 4 ações concluídas'],
  ['type-micro', 'Geist 11/500', 'em breve · 1:1 · 10:00'],
  ['type-mono', 'Geist Mono 12/500', 'PDI-02 · M-01 · 3/5 · 15 out'],
] as const

const ESPACOS = [
  ['space-1', 'w-1', 4],
  ['space-2', 'w-2', 8],
  ['space-3', 'w-3', 12],
  ['space-4', 'w-4', 16],
  ['space-5', 'w-5', 20],
  ['space-6', 'w-6', 24],
  ['space-7', 'w-7', 28],
] as const

const RAIOS = [
  ['2xs', 'rounded-2xs', 4],
  ['xs', 'rounded-xs', 6],
  ['sm', 'rounded-sm', 8],
  ['md', 'rounded-md', 10],
  ['lg', 'rounded-lg', 12],
  ['xl', 'rounded-xl', 16],
  ['2xl', 'rounded-2xl', 20],
] as const

/** Valor resolvido de uma variável CSS de token (o CSS já está carregado quando a rota abre). */
function valorToken(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()
}

function Amostra({ cor }: { cor: Cor }) {
  const nomeVar = cor.token.startsWith('status-') ? `${cor.token}-bg` : cor.token.startsWith('trilha-') ? `${cor.token}-bg` : cor.token
  const valor = valorToken(nomeVar)
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn('flex h-14 items-center justify-center rounded-md border border-line type-small font-semibold', cor.classe, cor.amostra)}>{cor.amostra ? 'Aa' : ''}</div>
      <span className="type-small font-medium">{cor.nome}</span>
      <span className="type-micro font-mono text-ink-3">
        {cor.token} · {valor}
      </span>
    </div>
  )
}

function Cartao({ titulo, nota, children, className }: { titulo: string; nota?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3.5 rounded-xl border border-line bg-card p-5', className)}>
      <h3 className="m-0 type-title">{titulo}</h3>
      {children}
      {nota && <p className="m-0 type-caption text-ink-3">{nota}</p>}
    </section>
  )
}

export function Fundamentos() {
  const avisar = useToast()
  const [filtro, setFiltro] = useState<'todas' | 'no-ritmo' | 'em-risco'>('todas')
  const [aba, setAba] = useState<'todas' | 'comportamental' | 'tecnica'>('todas')
  const [nivel, setNivel] = useState<Maturidade>(1)
  const [pasta, setPasta] = useState(1)
  const [status, setStatus] = useState<(typeof STATUS_ACAO)[number]>('em-andamento')

  return (
    <div className="min-h-screen bg-shell px-4 py-12 sm:px-6">
      <main className="mx-auto flex max-w-[1200px] flex-col gap-10">
        <header className="flex flex-col gap-2">
          <span className="type-mono text-ink-3">MEU PDI · DESIGN SYSTEM · v0.2</span>
          <h1 className="m-0 type-display">Fundamentos</h1>
          <p className="m-0 max-w-[720px] type-body text-ink-2">
            Catálogo vivo dos tokens de <code className="type-mono">styles/tokens.css</code> e dos componentes de <code className="type-mono">web/components</code>. Só existe em
            desenvolvimento.
          </p>
        </header>

        <section className="flex flex-col gap-4" aria-labelledby="cores">
          <h2 id="cores" className="m-0 type-h2">
            01 · Cores
          </h2>
          {GRUPOS_COR.map((g) => (
            <div key={g.titulo} className="flex flex-col gap-2.5 rounded-xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="m-0 type-title">{g.titulo}</h3>
                <span className="type-small text-ink-3">{g.uso}</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                {g.cores.map((cor) => (
                  <Amostra key={cor.token} cor={cor} />
                ))}
              </div>
            </div>
          ))}
          <p className="m-0 type-small text-ink-2">Status nunca aparece só pela cor: sempre vem com rótulo ou ícone.</p>
        </section>

        <section className="flex flex-wrap gap-4">
          <div className="flex flex-[1_1_520px] flex-col gap-3 rounded-xl border border-line bg-card p-5">
            <h2 className="m-0 type-h2">02 · Tipografia</h2>
            {TIPOS.map(([classe, spec, exemplo]) => (
              <div key={classe} className="grid grid-cols-1 items-baseline gap-1 border-t border-divider pt-2.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
                <span className="type-micro font-mono text-ink-3">
                  {classe}
                  <br />
                  {spec}
                </span>
                <span className={cn(classe, 'min-w-0 break-words')}>{exemplo}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-[1_1_360px] flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
              <h2 className="m-0 type-h2">03 · Espaço e raio</h2>
              {ESPACOS.map(([token, w, px]) => (
                <div key={token} className="flex items-center gap-3">
                  <span className="w-18 type-micro font-mono text-ink-3">{token}</span>
                  <span className={cn('h-3 rounded-[3px] bg-accent', w)} />
                  <span className="type-caption">{px}px</span>
                </div>
              ))}
              <div className="flex flex-wrap gap-3 pt-2">
                {RAIOS.map(([token, classe, px]) => (
                  <div key={token} className="flex flex-col items-center gap-1.5">
                    <span className={cn('h-11 w-14 border-[1.5px] border-ink bg-muted', classe)} />
                    <span className="type-micro font-mono text-ink-3">
                      {token} {px}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
              <h2 className="m-0 type-h2">04 · Elevação</h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex h-16 min-w-24 flex-1 items-center justify-center rounded-lg border border-line bg-card type-micro font-mono shadow-1">shadow-1 · card</div>
                <div className="flex h-16 min-w-24 flex-1 items-center justify-center rounded-lg bg-card type-micro font-mono shadow-2">shadow-2 · toast</div>
                <div className="flex h-16 min-w-24 flex-1 items-center justify-center rounded-lg bg-card type-micro font-mono ring-select">ring · selecionado</div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="componentes">
          <h2 id="componentes" className="m-0 type-h2">
            05 · Componentes
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-4">
            <Cartao titulo="Button" nota="Altura 40px (44px em toque). Um primário por tela, no topo à direita.">
              <div className="flex flex-wrap items-center gap-2">
                <Button variante="primario" icone={<Plus aria-hidden="true" className="size-4" />}>
                  Primário
                </Button>
                <Button variante="secundario">Secundário</Button>
                <Button variante="suave">Suave</Button>
                <IconButton rotulo="Adicionar">
                  <Plus aria-hidden="true" className="size-4" />
                </IconButton>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variante="primario" disabled>
                  Desabilitado
                </Button>
                <Button variante="secundario" disabled>
                  Desabilitado
                </Button>
              </div>
            </Cartao>

            <Cartao titulo="StatusPill" nota="Variantes: acao-status, meta-estado, feedback-tipo, prioridade, competencia-status. Sempre ponto + texto.">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ACAO.map((v) => (
                  <StatusPill key={v} variante="acao-status" valor={v} />
                ))}
                {ESTADOS_META.map((v) => (
                  <StatusPill key={v} variante="meta-estado" valor={v} />
                ))}
                {PRIORIDADES.map((v) => (
                  <StatusPill key={v} variante="prioridade" valor={v} />
                ))}
                {TIPOS_FEEDBACK.map((v) => (
                  <StatusPill key={v} variante="feedback-tipo" valor={v} />
                ))}
                {STATUS_COMPETENCIA.map((v) => (
                  <StatusPill key={v} variante="competencia-status" valor={v} />
                ))}
              </div>
            </Cartao>

            <Cartao titulo="LevelDots · SegmentBar · ProgressTime" nota="Barra empilhada com 2px entre segmentos. Progresso × tempo: o traço marca o tempo decorrido.">
              <div className="flex flex-wrap items-center gap-4">
                <LevelDots nome="System Design" pilar="tecnica" nivel={1} meta={2} />
                <LevelDots nome="Comunicação" pilar="comportamental" nivel={nivel} meta={2} onChange={setNivel} />
              </div>
              <SegmentBar
                rotulo="Ações da trilha"
                segmentos={STATUS_ACAO.map((s, i) => ({ valor: [1, 2, 1, 3][i]!, rotulo: TOM_STATUS_ACAO[s].label, cor: TOM_STATUS_ACAO[s].chart }))}
              />
              <ProgressTime progresso={40} tempo={72} />
            </Cartao>

            <Cartao titulo="Donut">
              <Donut
                titulo="Ações do ciclo"
                rotuloTotal="ações"
                fatias={STATUS_ACAO.map((s, i) => ({ valor: [4, 5, 1, 5][i]!, rotulo: TOM_STATUS_ACAO[s].label, traco: TOM_STATUS_ACAO[s].stroke }))}
              />
            </Cartao>

            <Cartao titulo="FolderCard" nota="Trilhas usam a cor de identidade; pastas de Projetos usam a paleta própria. Selecionada = anel.">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <FolderCard key={n} tom={TOM_TRILHA[n as 1]} altura={92} selecionada={pasta === n} onClick={() => setPasta(n)} rotulo={`Trilha T${n}`}>
                    <span className="flex items-end justify-between">
                      <span className="type-mono">T{n}</span>
                      <span className="type-h2">{n * 25}%</span>
                    </span>
                  </FolderCard>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <FolderCard key={i} tom={tomPasta(i)} altura={72}>
                    <span className="type-caption font-semibold">Pasta {i + 1}</span>
                  </FolderCard>
                ))}
              </div>
            </Cartao>

            <Cartao titulo="CalendarEvent" nota="1:1 em tinta; prazo de meta na cor da trilha; prazo de ação com contorno; véspera tracejada.">
              <div className="flex max-w-[220px] flex-col gap-1.5">
                <CalendarEvent tipo="reuniao" titulo="1:1 · 10:00" />
                <CalendarEvent tipo="prazo-meta" cor={2} titulo="M-02 Demo na review" />
                <CalendarEvent tipo="prazo-acao" titulo="PDI-11" />
                <CalendarEvent tipo="bloco" cor={5} titulo="Estudo AWS · M-03" />
                <CalendarEvent tipo="preparar-pauta" titulo="Preparar pauta da 1:1" />
              </div>
            </Cartao>

            <Cartao titulo="Toast · Filtro · Abas">
              <div className="flex flex-col gap-2">
                <ToastVisual tipo="sucesso" texto="PDI-02 movida para Concluído" />
                <ToastVisual tipo="erro" texto="Esta ação foi alterada no Obsidian" />
                <Button variante="suave" className="self-start" onClick={() => avisar('Toast de exemplo disparado')}>
                  Disparar toast
                </Button>
              </div>
              <FilterChips
                rotulo="Filtrar metas"
                valor={filtro}
                onChange={setFiltro}
                opcoes={[
                  { valor: 'todas', label: 'Todas' },
                  { valor: 'no-ritmo', label: 'No ritmo' },
                  { valor: 'em-risco', label: 'Em risco' },
                ]}
              />
              <SegmentedTabs
                rotulo="Pilar"
                valor={aba}
                onChange={setAba}
                abas={[
                  { valor: 'todas', label: 'Todas' },
                  { valor: 'comportamental', label: 'Comportamentais' },
                  { valor: 'tecnica', label: 'Técnicas' },
                ]}
              >
                <p className="m-0 type-caption text-ink-3">Painel da aba: {aba}</p>
              </SegmentedTabs>
            </Cartao>

            <Cartao titulo="ActionCard" nota="Avançar e Voltar são botões com rótulo acessível.">
              <ActionCard
                acao={{
                  id: 'PDI-02',
                  titulo: 'Escrever um ADR de decisão do time',
                  competenciaId: 'metodologias',
                  prioridade: 'media',
                  prazo: '2026-10-30',
                  status,
                  meta: 'M-01',
                  marcos: [
                    { texto: 'a', feito: true },
                    { texto: 'b', feito: true },
                    { texto: 'c', feito: false },
                  ],
                }}
                onMover={(s) => {
                  setStatus(s)
                  avisar(`PDI-02 movida para ${TOM_STATUS_ACAO[s].label}`)
                }}
              />
            </Cartao>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] overflow-hidden rounded-xl border border-line bg-card">
            <KpiCell numero="01" rotulo="Ações concluídas" valor={5} de="de 15" apoio="33% do ciclo" />
            <KpiCell numero="02" rotulo="Metas ativas" valor={5} de="de 6" apoio="1 atrasada" tomApoio="alerta" />
            <KpiCell numero="03" rotulo="Competências na meta" valor={7} de="de 18" apoio="meta: Pleno" />
            <KpiCell numero="04" rotulo="Feedbacks registrados" valor={7} de="em 3 1:1s" apoio="3 viraram metas" tomApoio="positivo" />
          </div>

          <div className="w-[264px] overflow-hidden rounded-xl border border-line">
            <Sidebar
              ciclo="2026.2"
              grupos={[
                {
                  titulo: 'Painel',
                  itens: [
                    { rotulo: 'Visão geral', icone: LayoutDashboard, to: '/_fundamentos' },
                    { rotulo: 'Competências', icone: ChartColumn, href: '#' },
                    { rotulo: 'Trilhas de carreira', icone: Route, href: '#' },
                    { rotulo: 'Planejamentos', icone: CalendarCheck, href: '#', contador: { valor: '1', rotulo: '1 meta atrasada', tom: 'alerta' } },
                    { rotulo: 'Projetos', icone: Folder, href: '#' },
                  ],
                },
                {
                  titulo: 'Ferramentas',
                  itens: [
                    { rotulo: 'Feedbacks', icone: MessageSquare, href: '#' },
                    { rotulo: 'Reuniões 1:1', icone: Users, href: '#', contador: { valor: '15/10', rotulo: 'Próxima 1:1 em 15/10', tom: 'info' } },
                  ],
                },
              ]}
              rodape={[
                { rotulo: 'Guia de carreira', icone: CircleHelp, href: '#' },
                { rotulo: 'Evidências (depois da v1)', icone: FileCheck, href: '#' },
                { rotulo: 'Configurações (depois da v1)', icone: SlidersHorizontal, href: '#' },
              ]}
              perfil={{ iniciais: 'RF', nome: 'Raquel Fontes', cargo: 'Engenheira de Software Jr' }}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
          <h2 className="m-0 type-h2">06 · Regras</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3 type-body">
            <div className="rounded-lg bg-status-done-bg p-3.5">
              <strong>Faça</strong>
              <br />
              Use a cor da trilha só para identidade (pastas, chips, prazos de meta). Use a cor de status só para estado. Derive números (KPIs, %, lacunas) dos dados, nunca grave-os.
            </div>
            <div className="rounded-lg bg-meta-atrasada-bg p-3.5">
              <strong>Evite</strong>
              <br />
              Cor como único sinal; mais de um botão primário por tela; texto colorido com a cor da série do gráfico; gradientes decorativos; hex fora de <code className="type-mono">tokens.css</code>.
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

