// Planejamentos (F13, F14): calendário mensal com 1:1s e prazos, painel do
// dia, metas da 1:1 com estado progresso × tempo e a linha do tempo das metas.
// Criar, editar e excluir metas grava no banco (ADR-007).

import { ChevronLeft, ChevronRight, Pencil, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Evento, MetaVista } from '../../../domain/aggregates'
import { dataValida, gradeDoMes, inicioDaSemana, limitesDoMes, mesDe, mesValido, somarMeses } from '../../../domain/datas'
import { diasEntre, hojeISO } from '../../../domain/metrics'
import { ESTADOS_META, type CorTrilha, type EstadoMeta, type Reuniao, type Trilha } from '../../../domain/types'
import { useAgenda, useMetas, useResumo, useReunioes, useTrilhas } from '../../api/queries'
import { Button, ButtonLink, IconButton } from '../../components/Button'
import { CalendarEvent } from '../../components/CalendarEvent'
import { ProgressTime } from '../../components/charts/ProgressTime'
import { cn } from '../../components/cn'
import { EstadoConsulta } from '../../components/EstadoConsulta'
import { FilterChips } from '../../components/FilterChips'
import { Secao } from '../../components/Secao'
import { StatusPill } from '../../components/StatusPill'
import { TOM_ESTADO_META, TOM_TRILHA } from '../../components/tones'
import { TrilhaChip } from '../../components/TrilhaChip'
import { dataCurta, diaPorExtenso, nomeDoMes, plural } from '../../format'
import { Painel } from '../../layout/AppShell'
import { PageHeader, TituloTela } from '../../layout/PageHeader'
import { escolha, useParametros } from '../../useParametros'
import { DialogoMeta } from '../edicao/formularios'

type FiltroEstado = 'todas' | EstadoMeta
const ROTULO_FILTRO: Record<FiltroEstado, string> = {
  todas: 'Todas',
  'no-ritmo': 'No ritmo',
  'em-risco': 'Em risco',
  atrasada: 'Atrasadas',
  concluida: 'Concluídas',
}
const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
/** Tipos de evento que o calendário mensal mostra (F14). Blocos de estudo ficam na agenda semanal. */
const TIPOS_CALENDARIO = new Set<Evento['tipo']>(['reuniao', 'prazo-meta', 'prazo-acao'])

export function Planejamentos() {
  const resumo = useResumo()
  const hoje = resumo.data?.hoje ?? hojeISO()
  const [params, alterar] = useParametros()

  const mesParam = params.get('mes')
  const mes = mesValido(mesParam) ? mesParam : mesDe(hoje)
  const diaParam = params.get('dia')
  const dia = dataValida(diaParam) ? diaParam : hoje
  const estado = escolha(params.get('estado'), ['todas', ...ESTADOS_META], 'todas')

  const grade = useMemo(() => gradeDoMes(mes), [mes])
  const agenda = useAgenda(grade[0]!, grade.at(-1)!)
  const metas = useMetas()
  const trilhas = useTrilhas()
  const reunioes = useReunioes()
  /** `null` fechado; `'nova'` cria; uma meta, edita. */
  const [edicao, setEdicao] = useState<MetaVista | 'nova' | null>(null)

  const corDe = useMemo(() => new Map((trilhas.data?.itens ?? []).map((t) => [t.id, t.cor])), [trilhas.data])
  const todasMetas = metas.data?.itens ?? []
  const filtradas = todasMetas.filter((m) => estado === 'todas' || m.estado === estado)

  const eventosPorDia = useMemo(() => {
    const m = new Map<string, Evento[]>()
    for (const e of agenda.data?.eventos ?? []) if (TIPOS_CALENDARIO.has(e.tipo)) m.set(e.data, [...(m.get(e.data) ?? []), e])
    return m
  }, [agenda.data])

  const proxima = resumo.data?.proximaReuniao
  const carregando = metas.isPending || agenda.isPending
  const erro = metas.error ?? agenda.error

  return (
    <>
      <PageHeader trilha={['Painel', 'Planejamentos']}>
        {proxima && (
          <ButtonLink to={`/reunioes?semana=${inicioDaSemana(proxima.data)}`} icone={<Users aria-hidden="true" className="size-4" />}>
            Próxima 1:1 · {dataCurta(proxima.data)}
          </ButtonLink>
        )}
        <Button variante="primario" icone={<Plus aria-hidden="true" className="size-4" />} onClick={() => setEdicao('nova')}>
          Nova meta
        </Button>
      </PageHeader>
      <DialogoMeta aberto={edicao !== null} onFechar={() => setEdicao(null)} meta={edicao === 'nova' ? undefined : (edicao ?? undefined)} />
      <Painel>
        <TituloTela
          titulo="Planejamentos"
          subtitulo="Metas combinadas em cada 1:1, ligadas às trilhas. Compare o progresso com o tempo que já passou para saber se cada meta está no ritmo."
        >
          <FilterChips
            rotulo="Filtrar metas por estado"
            valor={estado}
            onChange={(v) => alterar({ estado: v === 'todas' ? null : v })}
            opcoes={(['todas', ...ESTADOS_META] as const).map((v) => ({
              valor: v,
              label: ROTULO_FILTRO[v],
              contagem: v === 'todas' ? todasMetas.length : todasMetas.filter((m) => m.estado === v).length,
            }))}
          />
        </TituloTela>

        <EstadoConsulta carregando={carregando} erro={erro} />

        <div className="flex flex-wrap items-start gap-4">
          <section aria-labelledby="titulo-mes" className="flex min-w-0 flex-[999_1_600px] flex-col gap-3.5 rounded-xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconButton rotulo="Mês anterior" onClick={() => alterar({ mes: somarMeses(mes, -1) })} className="size-9">
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </IconButton>
                <h2 id="titulo-mes" aria-live="polite" className="m-0 min-w-38 text-center type-h2">
                  {nomeDoMes(mes)}
                </h2>
                <IconButton rotulo="Próximo mês" onClick={() => alterar({ mes: somarMeses(mes, 1) })} className="size-9">
                  <ChevronRight aria-hidden="true" className="size-4" />
                </IconButton>
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-3 p-0 type-caption text-ink-2">
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-3 rounded-[4px] bg-ink" />
                  1:1
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="box-border size-3 rounded-[4px] border border-trilha-1-tab bg-trilha-1-bg" />
                  Prazo de meta (cor da trilha)
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="box-border size-3 rounded-[4px] border border-line-strong" />
                  Prazo de ação
                </li>
              </ul>
            </div>
            <div role="region" aria-label={`Calendário de ${nomeDoMes(mes)}`} tabIndex={0} className="overflow-x-auto">
              <div className="min-w-160">
                <div aria-hidden="true" className="grid grid-cols-7 gap-1 pb-1.5">
                  {SEMANA.map((d) => (
                    <span key={d} className="px-1.5 type-caption text-ink-3">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {grade.map((d) => {
                    const evs = eventosPorDia.get(d) ?? []
                    const noMes = mesDe(d) === mes
                    const selecionado = d === dia
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => alterar({ dia: d === hoje ? null : d, mes: noMes ? mesParam : mesDe(d) })}
                        aria-pressed={selecionado}
                        aria-label={`${dataCurta(d)}${d === hoje ? ', hoje' : ''}${evs.length ? `, ${plural(evs.length, 'evento')}` : ''}`}
                        className={cn(
                          'flex min-h-28 flex-col items-stretch gap-1 rounded-md p-1.5 text-left',
                          selecionado ? 'border-[1.5px] border-ink' : 'border border-divider',
                          noMes ? 'bg-card hover:bg-muted' : 'bg-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex size-6 items-center justify-center rounded-full type-small',
                            d === hoje ? 'bg-alert font-semibold text-on-ink' : noMes ? 'text-ink' : 'text-ink-3',
                          )}
                        >
                          {Number(d.slice(8))}
                        </span>
                        {evs.slice(0, 3).map((e) => (
                          <CalendarEvent key={`${e.tipo}-${e.ref}`} tipo={e.tipo} titulo={rotuloCurto(e)} cor={e.trilha ? corDe.get(e.trilha) : null} />
                        ))}
                        {evs.length > 3 && <span className="px-1.5 type-micro text-ink-3">+{evs.length - 3}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside aria-label="Dia e metas" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <DiaSelecionado dia={dia} hoje={hoje} eventos={eventosPorDia.get(dia) ?? []} carregado={!!agenda.data} corDe={corDe} metas={todasMetas} />
            <Secao titulo="Metas do ciclo" extra={<span className="type-caption text-ink-3">progresso × tempo</span>} className="gap-1">
              {filtradas.length ? (
                <ul className="m-0 flex list-none flex-col p-0">
                  {filtradas.map((m) => (
                    <ItemMeta
                      key={m.id}
                      meta={m}
                      cor={corDe.get(m.trilha)}
                      trilha={trilhas.data?.itens.find((t) => t.id === m.trilha)}
                      onEditar={() => setEdicao(m)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="m-0 pt-2 type-small text-ink-3">{todasMetas.length ? 'Nenhuma meta com esse estado.' : 'Nenhuma meta ainda. Use “Nova meta” para registrar a primeira.'}</p>
              )}
            </Secao>
          </aside>
        </div>

        {filtradas.length > 0 && <LinhaDoTempo metas={filtradas} hoje={hoje} reunioes={reunioes.data?.itens ?? []} corDe={corDe} />}
      </Painel>
    </>
  )
}

function rotuloCurto(e: Evento): string {
  if (e.tipo === 'reuniao') return `1:1 · ${e.inicio}`
  if (e.tipo === 'prazo-meta') return `${e.ref} ${e.titulo}`
  return e.ref
}

function DiaSelecionado({
  dia,
  hoje,
  eventos,
  carregado,
  corDe,
  metas,
}: {
  dia: string
  hoje: string
  eventos: Evento[]
  carregado: boolean
  corDe: Map<string, CorTrilha>
  metas: MetaVista[]
}) {
  return (
    <section aria-labelledby="titulo-dia" className="flex flex-col gap-2.5 rounded-xl border border-line bg-card p-5">
      <span className="type-caption text-ink-3">{dia === hoje ? 'Hoje' : 'Dia selecionado'}</span>
      <h2 id="titulo-dia" className="m-0 type-h2">
        {diaPorExtenso(dia)}
      </h2>
      {eventos.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {eventos.map((e) => {
            const cor = e.trilha ? corDe.get(e.trilha) : undefined
            const { to, sub } = destino(e, hoje, metas)
            const classes = 'flex items-center gap-2.5 rounded-lg bg-muted p-2.5 text-ink no-underline hover:bg-soft'
            const conteudo = (
              <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'box-border size-2.5 shrink-0 rounded-[3px]',
                      e.tipo === 'reuniao' && 'bg-ink',
                      e.tipo === 'prazo-meta' && (cor ? TOM_TRILHA[cor].barra : 'bg-ink-3'),
                      e.tipo === 'prazo-acao' && 'border border-ink-3',
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="type-small font-medium">{e.tipo === 'reuniao' ? `1:1 · ${e.inicio}–${e.fim}` : `${e.ref} · ${e.titulo}`}</span>
                    <span className="type-caption text-ink-3">{sub}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
              </>
            )
            return (
              <li key={`${e.tipo}-${e.ref}`}>
                {/* Âncora na própria página (meta na lista ao lado) ou rota de outra tela. */}
                {to.startsWith('#') ? (
                  <a href={to} className={classes}>
                    {conteudo}
                  </a>
                ) : (
                  <Link to={to} className={classes}>
                    {conteudo}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        carregado && <p className="m-0 type-small text-ink-3">Nada planejado neste dia.</p>
      )}
    </section>
  )
}

function destino(e: Evento, hoje: string, metas: MetaVista[]): { to: string; sub: string } {
  if (e.tipo === 'reuniao') {
    return e.data < hoje
      ? { to: `/feedbacks?reuniao=${e.data}`, sub: 'Realizada · ver feedbacks' }
      : { to: `/reunioes?semana=${inicioDaSemana(e.data)}`, sub: 'Abrir pauta' }
  }
  if (e.tipo === 'prazo-meta') {
    const m = metas.find((x) => x.id === e.ref)
    return { to: `#meta-${e.ref}`, sub: `Prazo da meta${m ? ` · ${TOM_ESTADO_META[m.estado].label}` : ''}` }
  }
  return { to: e.trilha ? `/trilhas/${e.trilha}` : '/trilhas', sub: `Prazo da ação${e.trilha ? ` · ${e.trilha}` : ''}` }
}

function ItemMeta({ meta: m, cor, trilha, onEditar }: { meta: MetaVista; cor?: CorTrilha; trilha?: Trilha; onEditar: () => void }) {
  return (
    <li id={`meta-${m.id}`} className="flex scroll-mt-4 flex-col gap-2 border-t border-divider py-3 first:border-t-0 target:rounded-sm target:ring-select">
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="type-micro font-mono text-ink-3">
            {m.id} · prazo {dataCurta(m.prazo)}
          </span>
          <span className="type-body leading-snug font-semibold">{m.titulo}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <StatusPill variante="meta-estado" valor={m.estado} />
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar ${m.id}`}
            title="Editar"
            className="-mr-1.5 inline-flex size-8 pointer-coarse:size-11 items-center justify-center rounded-sm text-ink-3 hover:bg-muted hover:text-ink"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
        </span>
      </div>
      <ProgressTime progresso={m.progresso} tempo={m.tempoDecorrido} />
      <div className="flex flex-wrap items-center gap-1.5 type-caption text-ink-2">
        <span>
          {m.progresso}% feito · {m.tempoDecorrido}% do prazo
        </span>
        <span aria-hidden="true">·</span>
        {cor && <TrilhaChip cor={cor} rotulo={m.trilha} titulo={trilha?.nome} estilo="mono" to={`/trilhas/${m.trilha}`} />}
        <Link to={`/reunioes?semana=${inicioDaSemana(m.reuniao)}`} className="text-ink-2 no-underline hover:underline">
          1:1 de {dataCurta(m.reuniao)}
        </Link>
      </div>
    </li>
  )
}

function LinhaDoTempo({ metas, hoje, reunioes, corDe }: { metas: MetaVista[]; hoje: string; reunioes: Reuniao[]; corDe: Map<string, CorTrilha> }) {
  // Do primeiro mês com meta criada ao último mês com prazo, incluindo hoje.
  const inicio = limitesDoMes(mesDe([hoje, ...metas.map((m) => m.criada)].sort()[0]!)).inicio
  const fim = limitesDoMes(mesDe([hoje, ...metas.map((m) => m.prazo)].sort().at(-1)!)).fim
  const total = diasEntre(inicio, fim) + 1
  const pos = (d: string) => (Math.min(Math.max(diasEntre(inicio, d), 0), total) / total) * 100

  const meses: string[] = []
  for (let m = mesDe(inicio); m <= mesDe(fim); m = somarMeses(m, 1)) meses.push(m)
  const marcos = reunioes.filter((r) => r.status !== 'cancelada' && r.data >= inicio && r.data <= fim)

  return (
    <Secao
      titulo="Linha do tempo das metas"
      extra={
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0 type-caption text-ink-2">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-0.5 bg-alert" />
            Hoje, {dataCurta(hoje)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rotate-45 bg-ink" />
            1:1
          </li>
        </ul>
      }
    >
      <div role="region" aria-label="Linha do tempo das metas" tabIndex={0} className="overflow-x-auto">
        <div className="grid min-w-190 grid-cols-[240px_minmax(0,1fr)] gap-y-2.5">
          <span />
          <div className="relative h-8.5 border-b border-divider">
            {meses.map((m) => (
              <span
                key={m}
                className="absolute top-0 h-8.5 border-l border-divider pl-1.5 type-caption text-ink-3"
                style={{ left: `${pos(limitesDoMes(m).inicio)}%` }}
              >
                {nomeDoMes(m).split(' ')[0]!.toLowerCase()}
              </span>
            ))}
            {marcos.map((r) => (
              <span
                key={r.data}
                title={`1:1 de ${dataCurta(r.data)}`}
                className={cn('absolute -bottom-1.25 -ml-1 size-2 rotate-45', r.data < hoje ? 'bg-ink-3' : 'bg-ink')}
                style={{ left: `${pos(r.data)}%` }}
              />
            ))}
          </div>
          {metas.map((m) => {
            const cor = corDe.get(m.trilha)
            const tom = cor ? TOM_TRILHA[cor] : null
            return (
              <div key={m.id} className="contents">
                <span className="truncate self-center pr-3 type-small font-medium">
                  {m.id} · {m.titulo}
                </span>
                <div className="relative h-7">
                  <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-alert" style={{ left: `${pos(hoje)}%` }} />
                  <span
                    role="img"
                    aria-label={`${m.id}: de ${dataCurta(m.criada)} a ${dataCurta(m.prazo)}, ${m.progresso}% feito, ${TOM_ESTADO_META[m.estado].label}`}
                    title={`${m.titulo}: ${dataCurta(m.criada)} → ${dataCurta(m.prazo)}`}
                    className={cn('absolute top-1 h-5 overflow-hidden rounded-xs', tom?.bg ?? 'bg-soft')}
                    style={{ left: `${pos(m.criada)}%`, width: `${Math.max(pos(m.prazo) - pos(m.criada), 0.5)}%` }}
                  >
                    <span className={cn('block h-5', tom?.barra ?? 'bg-ink-3')} style={{ width: `${m.progresso}%` }} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Secao>
  )
}
