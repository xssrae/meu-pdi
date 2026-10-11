// Visão geral (F19): KPIs, pastas das trilhas, status por trilha, rosca,
// próxima 1:1, prazos e últimos feedbacks. Tudo vem de `/api/resumo`.

import { ArrowRight, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import type { Resumo } from '../../../domain/aggregates'
import { NOME_NIVEL } from '../../../domain/framework'
import { STATUS_ACAO, type ArquivoComErro, type CorTrilha } from '../../../domain/types'
import { useResumo } from '../../api/queries'
import { Donut } from '../../components/charts/Donut'
import { Legenda } from '../../components/charts/Legenda'
import { SegmentBar } from '../../components/charts/SegmentBar'
import { cn } from '../../components/cn'
import { EstadoConsulta, Vazio } from '../../components/EstadoConsulta'
import { FolderCard } from '../../components/FolderCard'
import { KpiCell } from '../../components/KpiCell'
import { Secao } from '../../components/Secao'
import { StatusPill } from '../../components/StatusPill'
import { LEGENDA_STATUS, segmentosStatus, TOM_ESTADO_META, TOM_STATUS_ACAO, TOM_TRILHA } from '../../components/tones'
import { TrilhaChip } from '../../components/TrilhaChip'
import { dataCurta, intervaloMeses, plural } from '../../format'
import { Painel } from '../../layout/AppShell'
import { PageHeader, TituloTela } from '../../layout/PageHeader'
import { CardProximaReuniao } from '../reunioes/CardProximaReuniao'

export function VisaoGeral() {
  const { data, isPending, error } = useResumo()

  return (
    <>
      <PageHeader trilha={['Painel', 'Visão geral']}>
        {data?.ciclo && (
          <span className="inline-flex min-h-10 items-center rounded-md border border-line-strong bg-card px-3 type-small text-ink-2">
            Ciclo {data.ciclo.id} · {intervaloMeses(data.ciclo.inicio, data.ciclo.fim)}
          </span>
        )}
      </PageHeader>
      <Painel>
        <TituloTela titulo="Visão geral" subtitulo="Resumo do ciclo: ações, metas da 1:1, competências e o caminho até o próximo nível.">
          {data?.ciclo && (
            <Link
              to="/trilhas"
              className="inline-flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2 type-small text-ink no-underline hover:border-line-strong"
            >
              <span className="rounded-full bg-ink px-2.5 py-0.5 font-medium text-on-ink">{NOME_NIVEL[data.ciclo.nivelAtual]}</span>
              <ArrowRight aria-hidden="true" className="size-4 text-ink-3" />
              <span className="rounded-full bg-accent px-2.5 py-0.5 font-medium text-on-ink">{NOME_NIVEL[data.ciclo.nivelAlvo]}</span>
              <span className="text-ink-2">próximo nível</span>
            </Link>
          )}
        </TituloTela>

        <EstadoConsulta carregando={isPending} erro={error} />

        {data && !data.ciclo && (
          <div className="rounded-xl border border-line bg-card p-5 type-body text-ink-2">
            Nenhum ciclo encontrado. Crie uma nota em <code className="type-mono">Ciclos/</code> na pasta do PDI.
          </div>
        )}

        {data && (
          <>
            <Kpis kpis={data.kpis} />
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
                <SuasTrilhas trilhas={data.trilhas} />
                <div className="flex flex-wrap gap-4">
                  <StatusPorTrilha trilhas={data.trilhas} />
                  <AcoesDoCiclo porStatus={data.acoesPorStatus} />
                </div>
              </div>
              <aside aria-label="Agenda e feedbacks" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
                <ProximaReuniao proxima={data.proximaReuniao} />
                <Prazos prazos={data.prazos} cores={new Map(data.trilhas.map((t) => [t.trilha, t.cor]))} />
                <UltimosFeedbacks feedbacks={data.ultimosFeedbacks} />
              </aside>
            </div>
            <ArquivosComErro erros={data.erros} />
          </>
        )}
      </Painel>
    </>
  )
}

function Kpis({ kpis }: { kpis: Resumo['kpis'] }) {
  const atrasadas = kpis.metas.atrasadas
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] overflow-hidden rounded-xl border border-line bg-card">
      <KpiCell numero="01" rotulo="Ações concluídas" valor={kpis.acoes.concluidas} de={`de ${kpis.acoes.total}`} apoio={`${kpis.acoes.pct}% do ciclo`} to="/trilhas" />
      <KpiCell
        numero="02"
        rotulo="Metas ativas"
        valor={kpis.metas.ativas}
        de={`de ${kpis.metas.total}`}
        apoio={atrasadas ? plural(atrasadas, 'atrasada') : 'nenhuma atrasada'}
        tomApoio={atrasadas ? 'alerta' : 'neutro'}
        to="/planejamentos"
      />
      <KpiCell
        numero="03"
        rotulo="Competências na meta"
        valor={kpis.competencias.naMeta}
        de={`de ${kpis.competencias.total}`}
        apoio={kpis.competencias.nivelAlvo ? `meta: ${NOME_NIVEL[kpis.competencias.nivelAlvo]}` : undefined}
        to="/competencias"
      />
      <KpiCell
        numero="04"
        rotulo="Feedbacks registrados"
        valor={kpis.feedbacks.total}
        de={`em ${kpis.feedbacks.reunioes} 1:1s`}
        apoio={`${kpis.feedbacks.viraramMeta} viraram metas`}
        tomApoio="positivo"
        to="/feedbacks"
      />
    </div>
  )
}

function SuasTrilhas({ trilhas }: { trilhas: Resumo['trilhas'] }) {
  return (
    <Secao titulo="Suas trilhas" link={{ to: '/trilhas', rotulo: 'Ver todas' }}>
      {trilhas.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,120px),1fr))] gap-4 p-0">
          {trilhas.map((t) => (
            <li key={t.trilha}>
              <Link to={`/trilhas/${t.trilha}`} className="group flex flex-col gap-2.5 rounded-xl text-ink no-underline">
                <FolderCard tom={TOM_TRILHA[t.cor]} altura={92}>
                  <span className="flex items-end justify-between">
                    <span className="type-mono">{t.trilha}</span>
                    <span className="text-[18px] font-semibold">{t.pct}%</span>
                  </span>
                </FolderCard>
                <span className="type-small leading-snug font-semibold group-hover:underline">{t.nome}</span>
                <span className="-mt-1.5 type-caption text-ink-3">
                  {t.concluidas} de {t.total} {t.total === 1 ? 'ação concluída' : 'ações concluídas'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio>Nenhuma trilha em Trilhas/.</Vazio>
      )}
    </Secao>
  )
}

function StatusPorTrilha({ trilhas }: { trilhas: Resumo['trilhas'] }) {
  return (
    <Secao titulo="Status das ações por trilha" extra={<Legenda itens={LEGENDA_STATUS} />} className="flex-[999_1_380px]">
      <div className="flex flex-col gap-3.5">
        {trilhas.map((t) => (
          <div key={t.trilha} className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-2 type-small">
              <span className="font-medium">{t.nome}</span>
              <span className="type-mono text-ink-2">
                {t.concluidas}/{t.total}
              </span>
            </div>
            <SegmentBar rotulo={t.nome} segmentos={segmentosStatus(t.porStatus)} />
          </div>
        ))}
      </div>
    </Secao>
  )
}

function AcoesDoCiclo({ porStatus }: { porStatus: Resumo['acoesPorStatus'] }) {
  return (
    <Secao titulo="Ações do ciclo" className="flex-[1_1_240px]">
      <div className="self-center">
        <Donut
          titulo="Ações do ciclo"
          rotuloTotal="ações"
          fatias={STATUS_ACAO.map((s) => ({ valor: porStatus[s], rotulo: TOM_STATUS_ACAO[s].label, traco: TOM_STATUS_ACAO[s].stroke }))}
        />
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {STATUS_ACAO.map((s) => (
          <li key={s} className="flex items-center justify-between type-small">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', TOM_STATUS_ACAO[s].chart)} />
              {TOM_STATUS_ACAO[s].label}
            </span>
            <span className="type-mono">{porStatus[s]}</span>
          </li>
        ))}
      </ul>
    </Secao>
  )
}

function ProximaReuniao({ proxima }: { proxima: Resumo['proximaReuniao'] }) {
  if (!proxima) {
    return (
      <Secao titulo="Próxima 1:1" link={{ to: '/reunioes', rotulo: 'Reuniões' }}>
        <p className="m-0 type-small text-ink-3">Nenhuma 1:1 agendada. Crie uma nota em Reunioes/ com status agendada.</p>
      </Secao>
    )
  }
  const metas = proxima.metasParaRevisar
  const atrasadas = metas.filter((m) => m.estado === 'atrasada').length
  const resumo = metas.length
    ? `${plural(metas.length, 'meta')} para revisar${atrasadas ? ` · ${plural(atrasadas, 'atrasada')}` : ''}`
    : 'Nenhuma meta ativa para revisar'
  return (
    <CardProximaReuniao reuniao={proxima} dias={proxima.emDias} variante="compacto" resumo={resumo}>
      {metas.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 type-small text-on-ink-2">
          {metas.slice(0, 3).map((m) => (
            <li key={m.id} className="flex gap-2">
              <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', TOM_ESTADO_META[m.estado].dot)} />
              <span>
                <span className="text-on-ink">{m.id}</span> · {m.titulo} ({TOM_ESTADO_META[m.estado].label.toLowerCase()})
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/reunioes"
        className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-md bg-card px-3.5 type-body font-medium text-ink no-underline hover:bg-muted"
      >
        Abrir pauta
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </CardProximaReuniao>
  )
}

function Prazos({ prazos, cores }: { prazos: Resumo['prazos']; cores: Map<string, CorTrilha> }) {
  return (
    <Secao titulo="Próximos prazos" link={{ to: '/planejamentos', rotulo: 'Calendário' }} className="gap-2">
      {prazos.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {prazos.map((p) => {
            const cor = cores.get(p.trilha)
            return (
              <li key={`${p.tipo}-${p.id}`} className="flex items-center gap-3 border-t border-divider py-2.5">
                <span className={cn('w-12 shrink-0 type-mono', p.atrasado ? 'text-meta-atrasada-fg' : 'text-ink-2')}>{dataCurta(p.data)}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="type-small font-medium">{p.titulo}</span>
                  <span className="type-caption text-ink-3">
                    {p.tipo === 'meta' ? `Meta ${p.id}` : `Ação ${p.id}`}
                    {p.atrasado ? ' · atrasada' : ''}
                  </span>
                </span>
                {cor && <TrilhaChip cor={cor} rotulo={p.trilha} estilo="mono" />}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="m-0 type-small text-ink-3">Nenhum prazo em aberto.</p>
      )}
    </Secao>
  )
}

function UltimosFeedbacks({ feedbacks }: { feedbacks: Resumo['ultimosFeedbacks'] }) {
  return (
    <Secao titulo="Últimos feedbacks" link={{ to: '/feedbacks', rotulo: 'Ver todos' }} className="gap-3">
      {feedbacks.length ? (
        feedbacks.map((f) => (
          <figure key={f.id} className="m-0 flex flex-col gap-1.5 rounded-lg bg-muted p-3">
            <figcaption className="flex flex-wrap items-center gap-2 type-caption text-ink-2">
              <StatusPill variante="feedback-tipo" valor={f.tipo} />
              1:1 de {dataCurta(f.reuniao)}
            </figcaption>
            <blockquote className="m-0 type-small">“{f.texto}”</blockquote>
          </figure>
        ))
      ) : (
        <p className="m-0 type-small text-ink-3">Nenhum feedback registrado.</p>
      )}
    </Secao>
  )
}

function ArquivosComErro({ erros }: { erros: readonly ArquivoComErro[] }) {
  if (!erros.length) return null
  return (
    <section aria-labelledby="arquivos-erro" className="flex flex-col gap-2 rounded-xl border border-meta-risco-bg bg-card p-5">
      <h2 id="arquivos-erro" className="m-0 flex items-center gap-2 type-h2">
        <TriangleAlert aria-hidden="true" className="size-4.5 text-meta-risco-fg" />
        Arquivos com erro
      </h2>
      <p className="m-0 type-small text-ink-2">Estas notas foram ignoradas. Corrija no Obsidian e volte a esta janela.</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {erros.map((e) => (
          <li key={e.arquivo} className="type-small">
            <span className="type-mono">{e.arquivo}</span> · <span className="text-ink-2">{e.mensagem}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
