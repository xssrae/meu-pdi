// Reuniões 1:1 (F15, F16): agenda semanal com 1:1s, prazos, blocos de estudo
// e "preparar pauta"; minicalendário do mês; pauta e metas da próxima 1:1;
// histórico das 1:1s realizadas. Registrar, editar (pauta inclusive) e
// excluir 1:1s grava no banco (ADR-007).

import { CalendarDays, Check, ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Evento } from '../../../domain/aggregates'
import { dataValida, diaDaSemana, gradeDoMes, inicioDaSemana, mesDe, somarDias } from '../../../domain/datas'
import { hojeISO } from '../../../domain/metrics'
import type { CorTrilha, Reuniao } from '../../../domain/types'
import { useAgenda, useFeedbacks, useMetas, useResumo, useReunioes, useTrilhas } from '../../api/queries'
import { Button, ButtonLink, IconButton } from '../../components/Button'
import { cn } from '../../components/cn'
import { EstadoConsulta } from '../../components/EstadoConsulta'
import { Secao } from '../../components/Secao'
import { StatusPill } from '../../components/StatusPill'
import { classesEvento } from '../../components/tones'
import { dataCurta, mesEDia, nomeDoMes, plural } from '../../format'
import { Painel } from '../../layout/AppShell'
import { PageHeader, TituloTela } from '../../layout/PageHeader'
import { useParametros } from '../../useParametros'
import { DialogoReuniao } from '../edicao/formularios'
import { CardProximaReuniao } from './CardProximaReuniao'

const DIAS_UTEIS = ['seg', 'ter', 'qua', 'qui', 'sex']
const H0 = 8
const H1 = 18
const PX_HORA = 52

/** Semana mostrada por padrão: a atual; no fim de semana, a próxima. */
function semanaPadrao(hoje: string): string {
  const dow = diaDaSemana(hoje)
  return dow === 0 || dow === 6 ? somarDias(inicioDaSemana(hoje), 7) : inicioDaSemana(hoje)
}

function horas(h: string): number {
  const [hh, mm] = h.split(':').map(Number)
  return hh! + mm! / 60
}

export function Reunioes() {
  const resumo = useResumo()
  const hoje = resumo.data?.hoje ?? hojeISO()
  const [params, alterar] = useParametros()
  const padrao = semanaPadrao(hoje)
  const semanaParam = params.get('semana')
  const segunda = dataValida(semanaParam) ? inicioDaSemana(semanaParam) : padrao
  const sexta = somarDias(segunda, 4)

  const semana = useAgenda(segunda, sexta)
  const mes = mesDe(segunda)
  const grade = useMemo(() => gradeDoMes(mes), [mes])
  const mensal = useAgenda(grade[0]!, grade.at(-1)!)
  const reunioes = useReunioes()
  const feedbacks = useFeedbacks()
  const metas = useMetas()
  const trilhas = useTrilhas()
  const [edicao, setEdicao] = useState<Reuniao | 'nova' | null>(null)

  const corDe = useMemo(() => new Map((trilhas.data?.itens ?? []).map((t) => [t.id, t.cor])), [trilhas.data])
  const irPara = (s: string) => alterar({ semana: s === padrao ? null : s })

  const historico = (reunioes.data?.itens ?? []).filter((r) => r.status === 'realizada')
  const proxima = resumo.data?.proximaReuniao
  const reuniaoProxima = proxima && reunioes.data?.itens.find((r) => r.data === proxima.data)

  return (
    <>
      <PageHeader trilha={['Painel', 'Ferramentas', 'Reuniões 1:1']}>
        <ButtonLink to={`/planejamentos?mes=${mes}`} icone={<CalendarDays aria-hidden="true" className="size-4" />}>
          Ver no calendário de metas
        </ButtonLink>
        <Button variante="primario" icone={<Plus aria-hidden="true" className="size-4" />} onClick={() => setEdicao('nova')}>
          Nova 1:1
        </Button>
      </PageHeader>
      <DialogoReuniao aberto={edicao !== null} onFechar={() => setEdicao(null)} reuniao={edicao === 'nova' ? undefined : (edicao ?? undefined)} />
      <Painel>
        <TituloTela
          titulo="Reuniões 1:1"
          subtitulo="Encontros com a liderança. A agenda mostra as 1:1s, os prazos das metas e os blocos de estudo; cada 1:1 gera feedbacks e novas metas."
        />

        <EstadoConsulta carregando={reunioes.isPending || semana.isPending} erro={reunioes.error ?? semana.error} />

        <div className="flex flex-wrap items-start gap-4">
          <aside aria-label="Calendário e histórico" className="flex min-w-0 flex-[1_1_240px] flex-col gap-4">
            <MiniCalendario
              mes={mes}
              grade={grade}
              hoje={hoje}
              segunda={segunda}
              eventos={mensal.data?.eventos ?? []}
              onEscolher={(d) => irPara(inicioDaSemana(d))}
            />
            <Secao titulo="Histórico" className="gap-1 p-4">
              {historico.length ? (
                <ul className="m-0 flex list-none flex-col p-0">
                  {historico.map((r) => {
                    const { mes: m, dia } = mesEDia(r.data)
                    const nFb = (feedbacks.data?.itens ?? []).filter((f) => f.reuniao === r.data).length
                    const nMetas = (metas.data?.itens ?? []).filter((x) => x.reuniao === r.data).length
                    return (
                      <li key={r.data} className="flex items-center gap-1 border-t border-divider">
                        <Link to={`/feedbacks?reuniao=${r.data}`} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-ink no-underline hover:bg-muted">
                          <span aria-hidden="true" className="flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-soft">
                            <span className="text-[10px] text-ink-3 uppercase">{m}</span>
                            <span className="text-[16px] leading-none font-semibold">{dia.padStart(2, '0')}</span>
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="sr-only">1:1 de {dataCurta(r.data)}: </span>
                            <span className="type-small font-medium">{r.tema ?? '1:1'}</span>
                            <span className="type-caption text-ink-3">
                              {plural(nFb, 'feedback')} · {plural(nMetas, 'meta')}
                            </span>
                          </span>
                          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEdicao(r)}
                          aria-label={`Editar a 1:1 de ${dataCurta(r.data)}`}
                          title="Editar"
                          className="inline-flex size-8 pointer-coarse:size-11 shrink-0 items-center justify-center rounded-sm text-ink-3 hover:bg-muted hover:text-ink"
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="m-0 type-small text-ink-3">Nenhuma 1:1 realizada ainda.</p>
              )}
            </Secao>
          </aside>

          <section aria-labelledby="titulo-semana" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconButton rotulo="Semana anterior" onClick={() => irPara(somarDias(segunda, -7))} className="size-9">
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </IconButton>
                <h2 id="titulo-semana" aria-live="polite" className="m-0 min-w-42 text-center type-h2">
                  {dataCurta(segunda)} – {dataCurta(sexta)}
                </h2>
                <IconButton rotulo="Próxima semana" onClick={() => irPara(somarDias(segunda, 7))} className="size-9">
                  <ChevronRight aria-hidden="true" className="size-4" />
                </IconButton>
              </div>
              <Button onClick={() => irPara(padrao)} disabled={segunda === padrao} className="min-h-9">
                Esta semana
              </Button>
            </div>
            <AgendaSemanal segunda={segunda} hoje={hoje} eventos={semana.data?.eventos ?? []} corDe={corDe} />
          </section>

          <aside aria-label="Próxima 1:1" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            {proxima ? (
              <CardProximaReuniao reuniao={proxima} dias={proxima.emDias}>
                <div className="flex flex-col gap-1.5">
                  <h3 className="m-0 type-caption font-normal text-on-ink-2">
                    Pauta · {proxima.pauta.filter((p) => p.feito).length} de {proxima.pauta.length}
                  </h3>
                  {proxima.pauta.length ? (
                    <ul className="m-0 flex list-none flex-col p-0">
                      {proxima.pauta.map((p) => (
                        <li key={p.texto} className="flex items-start gap-2.5 py-1.5 type-small">
                          <span
                            aria-hidden="true"
                            className={cn(
                              'mt-0.5 inline-flex size-4.5 shrink-0 items-center justify-center rounded-[5px]',
                              p.feito ? 'bg-card text-ink' : 'border-[1.5px] border-on-ink-2',
                            )}
                          >
                            {p.feito && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          <span className={p.feito ? 'text-on-ink-2 line-through' : undefined}>
                            <span className="sr-only">{p.feito ? 'Feito: ' : 'Pendente: '}</span>
                            {p.texto}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 type-small text-on-ink-2">Sem pauta ainda.</p>
                  )}
                </div>
                {reuniaoProxima && (
                  <Button variante="suave" className="self-start" icone={<Pencil aria-hidden="true" className="size-3.5" />} onClick={() => setEdicao(reuniaoProxima)}>
                    Editar 1:1 e pauta
                  </Button>
                )}
              </CardProximaReuniao>
            ) : (
              resumo.data && (
                <Secao titulo="Próxima 1:1">
                  <p className="m-0 type-small text-ink-3">Nenhuma 1:1 agendada. Use “Nova 1:1” para marcar a próxima.</p>
                </Secao>
              )
            )}

            {proxima && (
              <Secao titulo="Metas para revisar" className="gap-1">
                {proxima.metasParaRevisar.length ? (
                  <ul className="m-0 flex list-none flex-col p-0">
                    {proxima.metasParaRevisar.slice(0, 5).map((m) => (
                      <li key={m.id}>
                        <Link
                          to={`/planejamentos#meta-${m.id}`}
                          className="flex items-center justify-between gap-2.5 border-t border-divider py-2.5 text-ink no-underline hover:bg-muted"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="type-micro font-mono text-ink-3">
                              {m.id} · prazo {dataCurta(m.prazo)}
                            </span>
                            <span className="type-small font-medium">{m.titulo}</span>
                          </span>
                          <StatusPill variante="meta-estado" valor={m.estado} className="shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 type-small text-ink-3">Nenhuma meta ativa.</p>
                )}
              </Secao>
            )}
          </aside>
        </div>
      </Painel>
    </>
  )
}

function MiniCalendario({
  mes,
  grade,
  hoje,
  segunda,
  eventos,
  onEscolher,
}: {
  mes: string
  grade: string[]
  hoje: string
  segunda: string
  eventos: Evento[]
  onEscolher: (d: string) => void
}) {
  const reunioes = new Set(eventos.filter((e) => e.tipo === 'reuniao').map((e) => e.data))
  const prazos = new Set(eventos.filter((e) => e.tipo === 'prazo-meta').map((e) => e.data))
  const domingo = somarDias(segunda, 6)
  return (
    <section aria-labelledby="titulo-minical" className="flex flex-col gap-2.5 rounded-xl border border-line bg-card p-4">
      <h2 id="titulo-minical" className="m-0 type-title">
        {nomeDoMes(mes)}
      </h2>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['s', 't', 'q', 'q', 's', 's', 'd'].map((d, i) => (
          <span key={i} aria-hidden="true" className="py-1 type-micro font-normal text-ink-3">
            {d}
          </span>
        ))}
        {grade.map((d) => {
          const naSemana = d >= segunda && d <= domingo
          const umaUm = reunioes.has(d)
          const prazo = prazos.has(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => onEscolher(d)}
              aria-pressed={naSemana}
              aria-label={`${dataCurta(d)}${d === hoje ? ', hoje' : ''}${umaUm ? ', 1:1' : ''}${prazo ? ', prazo de meta' : ''}`}
              className={cn(
                'flex h-9 flex-col items-center justify-center gap-0.5 rounded-sm type-caption',
                d === hoje ? 'bg-alert font-semibold text-on-ink' : naSemana ? 'bg-track text-ink' : mesDe(d) === mes ? 'text-ink hover:bg-muted' : 'text-ink-3 hover:bg-muted',
              )}
            >
              {Number(d.slice(8))}
              <span aria-hidden="true" className={cn('size-1.25 rounded-full', umaUm ? (d === hoje ? 'bg-card' : 'bg-ink') : prazo ? 'bg-accent' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0 type-micro font-normal text-ink-2">
        <li className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" />
          1:1
        </li>
        <li className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          prazo de meta
        </li>
      </ul>
    </section>
  )
}

function AgendaSemanal({ segunda, hoje, eventos, corDe }: { segunda: string; hoje: string; eventos: Evento[]; corDe: Map<string, CorTrilha> }) {
  const dias = DIAS_UTEIS.map((nome, i) => {
    const data = somarDias(segunda, i)
    const doDia = eventos.filter((e) => e.data === data)
    return {
      nome,
      data,
      umaUm: doDia.some((e) => e.tipo === 'reuniao'),
      prazos: doDia.filter((e) => !e.inicio),
      comHorario: doDia.filter((e) => e.inicio && e.fim),
    }
  })
  const altura = (H1 - H0) * PX_HORA

  return (
    <div role="region" aria-label="Agenda da semana" tabIndex={0} className="overflow-x-auto">
      <div className="grid min-w-115 grid-cols-[44px_repeat(5,minmax(0,1fr))] gap-x-1.5">
        <span />
        {dias.map((d) => (
          <div key={d.data} className="flex flex-col gap-1.5 pb-2">
            <span className="flex items-baseline gap-1.5">
              <span className="type-caption text-ink-3">{d.nome}</span>
              <span
                className={cn(
                  'inline-flex size-7.5 items-center justify-center rounded-full text-[18px] font-semibold',
                  d.data === hoje ? 'bg-alert text-on-ink' : d.umaUm ? 'bg-ink text-on-ink' : 'text-ink',
                )}
              >
                {Number(d.data.slice(8))}
              </span>
            </span>
            <ul className="m-0 flex min-h-5.5 list-none flex-col gap-0.75 p-0">
              {d.prazos.map((e) => (
                <li key={`${e.tipo}-${e.ref}`} title={`${e.ref} · ${e.titulo}`} className={cn('truncate rounded-xs px-1.5 py-0.5 type-micro', classesEvento(e.tipo, e.trilha ? corDe.get(e.trilha) : null))}>
                  {e.ref} prazo
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div aria-hidden="true" className="relative" style={{ height: altura }}>
          {Array.from({ length: H1 - H0 }, (_, i) => (
            <span key={i} className="absolute left-0 -translate-y-1.5 type-micro font-mono font-normal text-ink-3" style={{ top: i * PX_HORA }}>
              {String(H0 + i).padStart(2, '0')}h
            </span>
          ))}
        </div>
        {dias.map((d) => (
          <ul
            key={d.data}
            aria-label={`${d.nome}, ${dataCurta(d.data)}: ${d.comHorario.length ? plural(d.comHorario.length, 'compromisso') : 'sem compromissos'}`}
            className={cn('relative m-0 list-none border-l border-divider p-0', d.umaUm && 'bg-panel')}
            style={{
              height: altura,
              backgroundImage: 'linear-gradient(var(--divider) 1px, transparent 1px)',
              backgroundSize: `100% ${PX_HORA}px`,
            }}
          >
            {d.comHorario.map((e) => {
              const ini = Math.max(horas(e.inicio!), H0)
              const fim = Math.min(Math.max(horas(e.fim!), ini + 0.25), H1)
              const passada = e.tipo === 'reuniao' && e.data < hoje
              // Até 30 min cabe uma linha só; o horário completo fica no `title`.
              const curto = fim - ini <= 0.5
              return (
                <li
                  key={`${e.tipo}-${e.ref}-${e.inicio}`}
                  className={cn(
                    'absolute inset-x-1 box-border flex flex-col overflow-hidden rounded-sm px-2',
                    curto ? 'justify-center py-0.5' : 'py-1',
                    // 1:1 já realizada fica em tinta secundária, sem sobrepor classes.
                    passada ? 'bg-ink-2 text-on-ink' : classesEvento(e.tipo, e.trilha ? corDe.get(e.trilha) : null),
                  )}
                  style={{ top: (ini - H0) * PX_HORA + 1, height: (fim - ini) * PX_HORA - 2 }}
                  title={`${e.titulo} · ${e.inicio}–${e.fim}`}
                >
                  <span className="shrink-0 truncate type-caption leading-tight font-semibold">{e.titulo}</span>
                  {curto ? (
                    <span className="sr-only">
                      {e.inicio}–{e.fim}
                    </span>
                  ) : (
                    <span className="truncate type-micro font-normal">
                      {e.inicio}–{e.fim}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ))}
      </div>
    </div>
  )
}
