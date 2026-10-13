// Feedbacks (F17): feedbacks das 1:1s agrupados por reunião, com filtros por
// 1:1 e por tipo. Cada um aponta para a competência, as trilhas dela e a meta
// que gerou. Registrar, editar e "Transformar em meta" gravam no banco (ADR-007).

import { CircleCheck, Pencil, Plus, Target, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { inicioDaSemana } from '../../../domain/datas'
import { competencia } from '../../../domain/framework'
import { TIPOS_FEEDBACK, type Feedback, type Reuniao, type Trilha } from '../../../domain/types'
import { useFeedbacks, useResumo, useReunioes, useTrilhas } from '../../api/queries'
import { Button, ButtonLink } from '../../components/Button'
import { cn } from '../../components/cn'
import { EstadoConsulta, Vazio } from '../../components/EstadoConsulta'
import { FilterChips } from '../../components/FilterChips'
import { StatusPill } from '../../components/StatusPill'
import { TOM_TIPO_FEEDBACK } from '../../components/tones'
import { TrilhaChip } from '../../components/TrilhaChip'
import { dataCurta, diaPorExtenso, emDias } from '../../format'
import { Painel } from '../../layout/AppShell'
import { PageHeader, TituloTela } from '../../layout/PageHeader'
import { escolha, useParametros } from '../../useParametros'
import { DialogoFeedback, DialogoMeta } from '../edicao/formularios'

type Edicao = { tipo: 'novo' } | { tipo: 'feedback'; feedback: Feedback } | { tipo: 'meta'; feedback: Feedback } | null

export function Feedbacks() {
  const feedbacks = useFeedbacks()
  const reunioes = useReunioes()
  const trilhas = useTrilhas()
  const resumo = useResumo()
  const [params, alterar] = useParametros()
  const [edicao, setEdicao] = useState<Edicao>(null)
  const fechar = () => setEdicao(null)

  const todos = useMemo(() => feedbacks.data?.itens ?? [], [feedbacks.data])
  // Datas de 1:1 com feedback, da mais recente para a mais antiga.
  const datas = useMemo(() => [...new Set(todos.map((f) => f.reuniao))].sort().reverse(), [todos])
  const reuniao = escolha(params.get('reuniao'), datas, 'todas')
  const tipo = escolha(params.get('tipo'), ['todos', ...TIPOS_FEEDBACK], 'todos')

  const reuniaoDe = useMemo(() => new Map((reunioes.data?.itens ?? []).map((r) => [r.data, r])), [reunioes.data])
  const trilhasDe = useMemo(() => {
    const m = new Map<string, Trilha[]>()
    for (const t of trilhas.data?.itens ?? []) for (const c of t.competencias) m.set(c, [...(m.get(c) ?? []), t])
    return m
  }, [trilhas.data])

  const grupos = datas
    .filter((d) => reuniao === 'todas' || d === reuniao)
    .map((d) => ({ data: d, reuniao: reuniaoDe.get(d), itens: todos.filter((f) => f.reuniao === d && (tipo === 'todos' || f.tipo === tipo)) }))
    .filter((g) => g.itens.length)

  const proxima = resumo.data?.proximaReuniao

  return (
    <>
      <PageHeader trilha={['Painel', 'Ferramentas', 'Feedbacks']}>
        <ButtonLink to="/reunioes" icone={<Users aria-hidden="true" className="size-4" />}>
          Reuniões 1:1
        </ButtonLink>
        <Button variante="primario" icone={<Plus aria-hidden="true" className="size-4" />} onClick={() => setEdicao({ tipo: 'novo' })}>
          Registrar feedback
        </Button>
      </PageHeader>
      <DialogoFeedback
        aberto={edicao?.tipo === 'novo' || edicao?.tipo === 'feedback'}
        onFechar={fechar}
        feedback={edicao?.tipo === 'feedback' ? edicao.feedback : undefined}
        reuniaoPadrao={reuniao === 'todas' ? undefined : reuniao}
      />
      <DialogoMeta
        aberto={edicao?.tipo === 'meta'}
        onFechar={fechar}
        padrao={
          edicao?.tipo === 'meta'
            ? { feedback: edicao.feedback.id, reuniao: edicao.feedback.reuniao, trilha: trilhasDe.get(edicao.feedback.competenciaId)?.[0]?.id }
            : undefined
        }
      />
      <Painel>
        <TituloTela
          titulo="Feedbacks"
          subtitulo="O que a liderança observou em cada 1:1, ligado a uma competência. Os feedbacks mais importantes viram metas em Planejamentos."
        />

        <EstadoConsulta carregando={feedbacks.isPending} erro={feedbacks.error} />

        <div className="flex flex-wrap items-start gap-4">
          <aside aria-label="Reuniões" className="flex min-w-0 flex-[1_1_240px] flex-col gap-4">
            <nav aria-label="Filtrar por reunião" className="flex flex-col gap-1 rounded-xl border border-line bg-card p-3">
              <span className="px-2 pt-1 pb-2 type-caption text-ink-3">Reuniões 1:1</span>
              <FiltroReuniao ativo={reuniao === 'todas'} onClick={() => alterar({ reuniao: null })} rotulo="Todas as 1:1" sub={`${datas.length} com feedback`} n={todos.length} />
              {datas.map((d) => (
                <FiltroReuniao
                  key={d}
                  ativo={reuniao === d}
                  onClick={() => alterar({ reuniao: d })}
                  rotulo={diaPorExtenso(d)}
                  sub={reuniaoDe.get(d)?.tema ?? '1:1'}
                  n={todos.filter((f) => f.reuniao === d).length}
                />
              ))}
            </nav>
            {proxima && (
              <Link to={`/reunioes?semana=${inicioDaSemana(proxima.data)}`} className="flex flex-col gap-1.5 rounded-xl bg-ink p-4 text-on-ink no-underline hover:bg-ink-hover">
                <span className="type-caption text-on-ink-2">Próxima 1:1 · {emDias(proxima.emDias)}</span>
                <span className="text-[16px] leading-snug font-semibold">
                  {diaPorExtenso(proxima.data)} · {proxima.inicio}
                </span>
                <span className="type-small text-on-ink-2">Abrir pauta →</span>
              </Link>
            )}
          </aside>

          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
            <FilterChips
              rotulo="Filtrar por tipo"
              valor={tipo}
              onChange={(v) => alterar({ tipo: v === 'todos' ? null : v })}
              opcoes={[
                { valor: 'todos' as const, label: 'Todos', ponto: 'bg-current' },
                ...TIPOS_FEEDBACK.map((t) => ({ valor: t, label: TOM_TIPO_FEEDBACK[t].label, ponto: TOM_TIPO_FEEDBACK[t].dot })),
              ]}
            />

            {grupos.map((g) => (
              <Grupo
                key={g.data}
                data={g.data}
                reuniao={g.reuniao}
                itens={g.itens}
                trilhasDe={trilhasDe}
                onEditar={(feedback) => setEdicao({ tipo: 'feedback', feedback })}
                onVirarMeta={(feedback) => setEdicao({ tipo: 'meta', feedback })}
              />
            ))}
            {feedbacks.data && !grupos.length && <Vazio>{todos.length ? 'Nenhum feedback com esses filtros.' : 'Nenhum feedback ainda. Use “Registrar feedback” depois de uma 1:1.'}</Vazio>}
          </div>
        </div>
      </Painel>
    </>
  )
}

function FiltroReuniao({ ativo, onClick, rotulo, sub, n }: { ativo: boolean; onClick: () => void; rotulo: string; sub: string; n: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'flex min-h-11 items-center justify-between gap-2 rounded-md px-2.5 py-1 text-left type-body',
        ativo ? 'bg-soft font-semibold' : 'font-medium hover:bg-muted',
      )}
    >
      <span className="flex flex-col">
        <span>{rotulo}</span>
        <span className="type-micro font-normal text-ink-3">{sub}</span>
      </span>
      <span className="type-mono text-ink-2">{n}</span>
    </button>
  )
}

function Grupo({
  data,
  reuniao,
  itens,
  trilhasDe,
  onEditar,
  onVirarMeta,
}: {
  data: string
  reuniao?: Reuniao
  itens: Feedback[]
  trilhasDe: Map<string, Trilha[]>
  onEditar: (f: Feedback) => void
  onVirarMeta: (f: Feedback) => void
}) {
  const id = `fb-${data}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <h2 id={id} className="m-0 type-title">
          1:1 de {dataCurta(data)}
        </h2>
        {reuniao?.tema && <span className="type-caption text-ink-3">{reuniao.tema}</span>}
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      {itens.map((f) => {
        const comp = competencia(f.competenciaId)
        return (
          <article key={f.id} aria-label={`${f.id}, ${TOM_TIPO_FEEDBACK[f.tipo].label}`} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <StatusPill variante="feedback-tipo" valor={f.tipo} />
              <span className="flex items-center gap-1">
                <span className="type-micro font-mono text-ink-3">{f.id}</span>
                <button
                  type="button"
                  onClick={() => onEditar(f)}
                  aria-label={`Editar ${f.id}`}
                  title="Editar"
                  className="-mr-1.5 inline-flex size-8 pointer-coarse:size-11 items-center justify-center rounded-sm text-ink-3 hover:bg-muted hover:text-ink"
                >
                  <Pencil aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            </div>
            <blockquote className="m-0 text-[15px] leading-normal">“{f.texto}”</blockquote>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3">
              <div className="flex flex-wrap gap-1.5">
                <Link
                  to={`/competencias?busca=${encodeURIComponent(comp?.nome ?? f.competenciaId)}`}
                  className="rounded-sm border border-line px-2 py-0.5 type-caption text-ink no-underline hover:border-line-strong"
                >
                  {comp?.nome ?? f.competenciaId}
                </Link>
                {(trilhasDe.get(f.competenciaId) ?? []).map((t) => (
                  <TrilhaChip key={t.id} cor={t.cor} rotulo={t.nome} to={`/trilhas/${t.id}`} />
                ))}
              </div>
              {f.meta && (
                <Link to={`/planejamentos#meta-${f.meta}`} className="inline-flex items-center gap-1.5 type-small font-medium text-status-done-fg no-underline hover:underline">
                  <CircleCheck aria-hidden="true" className="size-4" />
                  Virou a meta {f.meta}
                </Link>
              )}
              {!f.meta && (
                <Button variante="suave" icone={<Target aria-hidden="true" className="size-3.5" />} onClick={() => onVirarMeta(f)} aria-label={`Transformar ${f.id} em meta`}>
                  Transformar em meta
                </Button>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}
