// Trilhas de carreira (F7, F10, F11): pastas T1…T5, detalhe da trilha
// selecionada, status por trilha e o quadro Kanban das ações da trilha.
// Criar e editar ações e trilhas, e mover os cards, grava no banco (ADR-007).

import { ChevronRight, Pencil, Plus } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { competencia, NOME_NIVEL } from '../../../domain/framework'
import { NIVEIS, STATUS_ACAO, type Acao, type Nivel, type Trilha } from '../../../domain/types'
import { useEscrita } from '../../api/mutacoes'
import { useAcoes, useCiclo, useMetas, useTrilhas } from '../../api/queries'
import { ActionCard } from '../../components/ActionCard'
import { Button, IconButton } from '../../components/Button'
import { Legenda } from '../../components/charts/Legenda'
import { SegmentBar } from '../../components/charts/SegmentBar'
import { cn } from '../../components/cn'
import { EstadoConsulta, Vazio } from '../../components/EstadoConsulta'
import { FolderCard } from '../../components/FolderCard'
import { Secao } from '../../components/Secao'
import { LEGENDA_STATUS, segmentosStatus, TOM_PILAR, TOM_STATUS_ACAO, TOM_TRILHA } from '../../components/tones'
import { useToast } from '../../components/toast-context'
import { plural } from '../../format'
import { Painel } from '../../layout/AppShell'
import { PageHeader, TituloTela } from '../../layout/PageHeader'
import { DialogoAcao, DialogoTrilha } from '../edicao/formularios'

type Edicao = { tipo: 'nova-acao' } | { tipo: 'acao'; acao: Acao } | { tipo: 'nova-trilha' } | { tipo: 'trilha'; trilha: Trilha } | null

export function Trilhas() {
  const { id } = useParams()
  const trilhas = useTrilhas()
  const acoes = useAcoes()
  const metas = useMetas()
  const ciclo = useCiclo()
  const [edicao, setEdicao] = useState<Edicao>(null)
  const escrita = useEscrita()
  const avisar = useToast()
  const fechar = () => setEdicao(null)

  function mover(a: Acao, para: Acao['status']) {
    escrita.mutate(
      { op: 'atualizar', entidade: 'acoes', chave: a.id, versao: a.versao, patch: { status: para } },
      {
        onSuccess: () => avisar(`${a.id} movida para ${TOM_STATUS_ACAO[para].label}`),
        onError: (e) => avisar(e.message, 'erro'),
      },
    )
  }

  const lista = useMemo(() => trilhas.data?.itens ?? [], [trilhas.data])
  const sel = lista.find((t) => t.id === id) ?? lista[0]
  const idInvalido = !!id && !!trilhas.data && !lista.some((t) => t.id === id)

  const carregando = trilhas.isPending || acoes.isPending
  const erro = trilhas.error ?? acoes.error ?? metas.error

  const daTrilha = (acoes.data?.itens ?? []).filter((a) => a.trilha === sel?.id)
  const metasDaTrilha = (metas.data?.itens ?? []).filter((m) => m.trilha === sel?.id && m.estado !== 'concluida').length

  return (
    <>
      <PageHeader trilha={['Painel', 'Trilhas de carreira', ...(sel ? [sel.nome] : [])]}>
        <Button icone={<Plus aria-hidden="true" className="size-4" />} onClick={() => setEdicao({ tipo: 'nova-trilha' })}>
          Nova trilha
        </Button>
        <Button
          variante="primario"
          icone={<Plus aria-hidden="true" className="size-4" />}
          disabled={!sel || !ciclo.data?.ciclo}
          title={!ciclo.data?.ciclo ? 'Crie um ciclo na Visão geral antes' : undefined}
          onClick={() => setEdicao({ tipo: 'nova-acao' })}
        >
          Nova ação
        </Button>
      </PageHeader>
      <DialogoAcao aberto={edicao?.tipo === 'nova-acao' || edicao?.tipo === 'acao'} onFechar={fechar} acao={edicao?.tipo === 'acao' ? edicao.acao : undefined} trilhaPadrao={sel?.id} />
      <DialogoTrilha aberto={edicao?.tipo === 'nova-trilha' || edicao?.tipo === 'trilha'} onFechar={fechar} trilha={edicao?.tipo === 'trilha' ? edicao.trilha : undefined} />
      <Painel>
        <TituloTela titulo="Trilhas de carreira" subtitulo="Cada trilha agrupa ações que desenvolvem um conjunto de competências rumo ao próximo nível.">
          {ciclo.data?.ciclo && <Niveis atual={ciclo.data.ciclo.nivelAtual} alvo={ciclo.data.ciclo.nivelAlvo} />}
        </TituloTela>

        <EstadoConsulta carregando={carregando} erro={erro} />
        {idInvalido && (
          <p role="status" className="m-0 type-small text-ink-2">
            A trilha {id} não existe; mostrando {sel?.id ?? 'a primeira'}.
          </p>
        )}
        {trilhas.data && !lista.length && <Vazio>Nenhuma trilha ainda. Use “Nova trilha” para criar a primeira.</Vazio>}

        {sel && (
          <>
            <section aria-labelledby="titulo-pastas" className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <h2 id="titulo-pastas" className="m-0 type-h2">
                  Trilhas
                </h2>
                <span className="rounded-full bg-track px-2.5 py-0.5 type-caption">{lista.length}</span>
              </div>
              <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4 p-0">
                {lista.map((t) => {
                  const tom = TOM_TRILHA[t.cor]
                  return (
                    <li key={t.id}>
                      <FolderCard
                        tom={tom}
                        altura={154}
                        to={`/trilhas/${t.id}`}
                        selecionada={t.id === sel.id}
                        rotulo={`${t.id} ${t.nome}: ${t.resumo.pct}% concluído, ${plural(t.resumo.total, 'ação', 'ações')}`}
                      >
                        <span className="flex h-full flex-col justify-between pt-1">
                          <span className="flex items-center justify-between">
                            <span className="type-mono">{t.id}</span>
                            <span className="type-caption font-semibold">{t.resumo.pct}%</span>
                          </span>
                          <span className="type-title leading-snug text-ink">{t.nome}</span>
                          <span className="flex flex-col gap-2">
                            <span className="block h-1 overflow-hidden rounded-xs bg-card/70">
                              <span className={cn('block h-1 rounded-xs', tom.barra)} style={{ width: `${t.resumo.pct}%` }} />
                            </span>
                            <span className="flex justify-between type-caption text-ink-2">
                              <span>{plural(t.resumo.total, 'ação', 'ações')}</span>
                              <span>{plural(t.competencias.length, 'competência')}</span>
                            </span>
                          </span>
                        </span>
                      </FolderCard>
                    </li>
                  )
                })}
              </ul>
            </section>

            <div className="flex flex-wrap items-stretch gap-4">
              <section aria-labelledby="titulo-trilha" className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 rounded-xl border border-line bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md type-mono', TOM_TRILHA[sel.cor].bg, TOM_TRILHA[sel.cor].fg)}>
                    {sel.id}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 id="titulo-trilha" className="m-0 text-[20px] leading-tight font-semibold">
                      {sel.nome}
                    </h2>
                    {sel.descricao && <p className="m-0 type-body text-ink-2">{sel.descricao}</p>}
                  </div>
                  <IconButton rotulo={`Editar a trilha ${sel.id}`} className="shrink-0" onClick={() => setEdicao({ tipo: 'trilha', trilha: sel })}>
                    <Pencil aria-hidden="true" className="size-4" />
                  </IconButton>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Numero valor={`${sel.resumo.pct}%`} rotulo="concluído" />
                  <Numero valor={sel.resumo.total} rotulo={sel.resumo.total === 1 ? 'ação' : 'ações'} />
                  <Numero valor={metasDaTrilha} rotulo={metasDaTrilha === 1 ? 'meta ativa' : 'metas ativas'} to="/planejamentos" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="m-0 type-caption font-normal text-ink-3">Competências desenvolvidas</h3>
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {sel.competencias.map((cid) => {
                      const comp = competencia(cid)
                      return (
                        <li key={cid}>
                          <Link
                            to={`/competencias?trilha=${sel.id}`}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 type-caption text-ink no-underline hover:border-line-strong"
                          >
                            {comp && <span aria-hidden="true" className={cn('size-2 rounded-full', TOM_PILAR[comp.pilar].dot)} />}
                            {comp?.nome ?? cid}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </section>

              <Secao titulo="Status por trilha" extra={<Legenda itens={LEGENDA_STATUS} />} className="flex-[999_1_480px]">
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {lista.map((t) => {
                    const ativa = t.id === sel.id
                    return (
                      <li key={t.id}>
                        <Link
                          to={`/trilhas/${t.id}`}
                          aria-current={ativa ? 'true' : undefined}
                          className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-x-3 gap-y-1.5 rounded-sm py-1.5 text-ink no-underline hover:bg-muted sm:grid-cols-[minmax(120px,200px)_minmax(0,1fr)_44px]"
                        >
                          <span className={cn('type-small', ativa ? 'font-semibold' : 'text-ink-2')}>{t.nome}</span>
                          <SegmentBar rotulo={t.nome} segmentos={segmentosStatus(t.resumo.porStatus)} className="order-last col-span-2 h-3.5 sm:order-none sm:col-span-1" />
                          <span className="text-right type-mono text-ink-2">
                            {t.resumo.concluidas}/{t.resumo.total}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </Secao>
            </div>

            <section aria-labelledby="titulo-quadro" className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id="titulo-quadro" className="m-0 type-h2">
                    Quadro da trilha
                  </h2>
                  <span className={cn('rounded-xs px-2 py-0.5 type-caption', TOM_TRILHA[sel.cor].bg, TOM_TRILHA[sel.cor].fg)}>{sel.nome}</span>
                </div>
                <span className="type-small text-ink-3">Avance ou volte cada card pelos botões dele</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] items-start gap-4">
                {STATUS_ACAO.map((s) => {
                  const cards = daTrilha.filter((a) => a.status === s)
                  const tom = TOM_STATUS_ACAO[s]
                  return (
                    <section key={s} aria-label={`${tom.label}: ${plural(cards.length, 'ação', 'ações')}`} className="flex min-w-0 flex-col gap-3">
                      <h3 className={cn('m-0 inline-flex items-center gap-2 self-start rounded-full py-1.5 pr-2 pl-2.5 type-small font-medium', tom.bg, tom.fg)}>
                        <span aria-hidden="true" className={cn('size-2 rounded-full', tom.dot)} />
                        {tom.label}
                        <span className="rounded-full bg-card px-2 py-px type-caption font-semibold text-ink">{cards.length}</span>
                      </h3>
                      {cards.map((a) => (
                        <ActionCard
                          key={a.id}
                          acao={a}
                          ocupado={escrita.isPending}
                          onMover={(para) => mover(a, para)}
                          onEditar={() => setEdicao({ tipo: 'acao', acao: a })}
                        />
                      ))}
                      {!cards.length && <Vazio>Nenhuma ação aqui.</Vazio>}
                    </section>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </Painel>
    </>
  )
}

function Numero({ valor, rotulo, to }: { valor: number | string; rotulo: string; to?: string }) {
  const conteudo = (
    <>
      <span className="text-[20px] leading-tight font-semibold">{valor}</span>
      <span className="type-caption text-ink-3">
        {rotulo}
        {to && <ChevronRight aria-hidden="true" className="ml-0.5 inline size-3.5 align-[-2px]" />}
      </span>
    </>
  )
  const classes = 'flex flex-col rounded-lg bg-muted px-3 py-2.5'
  return to ? (
    <Link to={to} className={cn(classes, 'text-ink no-underline hover:bg-soft')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classes}>{conteudo}</div>
  )
}

/** Júnior (atual) → Pleno (próximo) → Sênior. */
function Niveis({ atual, alvo }: { atual: Nivel; alvo: Nivel }) {
  return (
    <ol aria-label="Níveis de carreira" className="m-0 flex list-none flex-wrap items-center gap-1 rounded-lg border border-line bg-card p-1.5">
      {NIVEIS.map((n, i) => (
        <Fragment key={n}>
          {i > 0 && (
            <li aria-hidden="true" className="flex text-ink-3">
              <ChevronRight className="size-3.5" />
            </li>
          )}
          <li
            className={cn(
              'flex items-center gap-2 rounded-sm px-2.5 py-1.5 type-small',
              n === atual && 'bg-ink font-medium text-on-ink',
              n === alvo && 'border-[1.5px] border-accent font-semibold text-accent-strong',
              n !== atual && n !== alvo && 'text-ink-3',
            )}
          >
            {NOME_NIVEL[n]}
            {n === atual && <span className="type-micro font-normal text-on-ink-2">atual</span>}
            {n === alvo && <span className="type-micro">próximo</span>}
          </li>
        </Fragment>
      ))}
    </ol>
  )
}
