// Projetos (F18): pastas, lista e detalhe dos projetos usados como evidência
// do PDI. Criar, editar e excluir projetos grava no banco (ADR-007). Sem
// upload de imagens (ADR-004 ainda proposto) e sem abrir as evidências no
// Obsidian, que chega na Fase 5.

import { FileText, ImageIcon, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Projeto, Trilha } from '../../../domain/types'
import { useProjetos, useTrilhas } from '../../api/queries'
import { Button, IconButton } from '../../components/Button'
import { cn } from '../../components/cn'
import { EstadoConsulta, Vazio } from '../../components/EstadoConsulta'
import { FolderCard } from '../../components/FolderCard'
import { ROTULO_STATUS_PROJETO, TOM_TRILHA, tomPasta } from '../../components/tones'
import { TrilhaChip } from '../../components/TrilhaChip'
import { plural } from '../../format'
import { Painel } from '../../layout/AppShell'
import { PageHeader, TituloTela } from '../../layout/PageHeader'
import { escolha, useParametros } from '../../useParametros'
import { DialogoProjeto } from '../edicao/formularios'

/** `rayo-cozy-space` → `RC` */
function sigla(nome: string): string {
  const partes = nome.split(/[-_\s]+/).filter(Boolean)
  return (partes.length > 1 ? partes[0]![0]! + partes[1]![0]! : nome.slice(0, 2)).toUpperCase()
}

export function Projetos() {
  const projetos = useProjetos()
  const trilhas = useTrilhas()
  const [params, alterar] = useParametros()
  const [edicao, setEdicao] = useState<Projeto | 'novo' | null>(null)

  const todos = useMemo(() => projetos.data?.itens ?? [], [projetos.data])
  const listaTrilhas = useMemo(() => trilhas.data?.itens ?? [], [trilhas.data])
  const trilhaDe = useMemo(() => new Map(listaTrilhas.map((t) => [t.id, t])), [listaTrilhas])
  // Pastas em ordem alfabética; a cor vem da posição (paleta própria de pastas).
  const pastas = useMemo(() => [...new Set(todos.map((p) => p.pasta))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [todos])

  const pasta = escolha(params.get('pasta'), pastas, '')
  const trilha = escolha(
    params.get('trilha'),
    listaTrilhas.map((t) => t.id),
    'todas',
  )
  const lista = todos
    .filter((p) => (!pasta || p.pasta === pasta) && (trilha === 'todas' || p.trilhas.includes(trilha)))
    .sort((a, b) => pastas.indexOf(a.pasta) - pastas.indexOf(b.pasta) || a.id.localeCompare(b.id))
  const sel = lista.find((p) => p.id === params.get('projeto')) ?? lista[0]

  return (
    <>
      <PageHeader trilha={['Painel', 'Projetos']}>
        <Button variante="primario" icone={<Plus aria-hidden="true" className="size-4" />} onClick={() => setEdicao('novo')}>
          Novo projeto
        </Button>
      </PageHeader>
      <DialogoProjeto aberto={edicao !== null} onFechar={() => setEdicao(null)} projeto={edicao === 'novo' ? undefined : (edicao ?? undefined)} />
      <Painel>
        <TituloTela
          titulo="Projetos"
          subtitulo="Projetos que servem de evidência para o PDI. Cada um se liga às trilhas que desenvolve e às notas do segundo cérebro que comprovam o trabalho."
        >
          <label className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line-strong bg-card pr-1 pl-3 type-small text-ink-3">
            Trilha:
            <select
              value={trilha}
              onChange={(e) => alterar({ trilha: e.target.value === 'todas' ? null : e.target.value, projeto: null })}
              className="min-h-9 max-w-56 border-0 bg-transparent type-small text-ink"
            >
              <option value="todas">Todas</option>
              {listaTrilhas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} · {t.nome}
                </option>
              ))}
            </select>
          </label>
        </TituloTela>

        <EstadoConsulta carregando={projetos.isPending} erro={projetos.error} />
        {projetos.data && !todos.length && <Vazio>Nenhum projeto ainda. Use “Novo projeto” e aponte para a nota dele em 02 Projetos/.</Vazio>}

        {pastas.length > 0 && (
          <section aria-labelledby="titulo-pastas" className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <h2 id="titulo-pastas" className="m-0 type-h2">
                Pastas
              </h2>
              <span className="rounded-full bg-track px-2.5 py-0.5 type-caption">{pastas.length}</span>
            </div>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4 p-0">
              {pastas.map((nome, i) => {
                const n = todos.filter((p) => p.pasta === nome).length
                return (
                  <li key={nome}>
                    <FolderCard
                      tom={tomPasta(i)}
                      altura={130}
                      selecionada={pasta === nome}
                      rotulo={`${nome}: ${plural(n, 'projeto')}`}
                      onClick={() => alterar({ pasta: pasta === nome ? null : nome, projeto: null })}
                    >
                      <span className="flex h-full flex-col justify-between pt-1">
                        <span className="font-mono text-[15px] font-medium text-ink">{nome}</span>
                        <span className="flex flex-col gap-2.5">
                          <span className="h-px bg-ink/12" />
                          <span className="type-caption text-ink-2">{plural(n, 'projeto')}</span>
                        </span>
                      </span>
                    </FolderCard>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {todos.length > 0 && (
          <div className="flex flex-wrap items-start gap-5">
            <section aria-labelledby="titulo-lista" className="flex min-w-0 flex-[999_1_520px] flex-col gap-3.5">
              <div className="flex items-center gap-2.5">
                <h2 id="titulo-lista" className="m-0 type-h2">
                  {pasta || 'Todos os projetos'}
                </h2>
                <span className="rounded-full bg-track px-2.5 py-0.5 type-caption">{lista.length}</span>
              </div>
              {lista.length ? (
                <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4 p-0">
                  {lista.map((p) => (
                    <li key={p.id}>
                      <CardProjeto projeto={p} trilhaDe={trilhaDe} selecionado={p.id === sel?.id} onClick={() => alterar({ projeto: p.id })} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio>Nenhum projeto com esses filtros.</Vazio>
              )}
            </section>
            {sel && <Detalhe projeto={sel} trilhaDe={trilhaDe} onEditar={() => setEdicao(sel)} />}
          </div>
        )}
      </Painel>
    </>
  )
}

function CardProjeto({ projeto: p, trilhaDe, selecionado, onClick }: { projeto: Projeto; trilhaDe: Map<string, Trilha>; selecionado: boolean; onClick: () => void }) {
  const principal = trilhaDe.get(p.trilhas[0] ?? '')
  const tom = principal ? TOM_TRILHA[principal.cor] : null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      className={cn('flex w-full flex-col rounded-2xl text-left', selecionado && 'ring-select')}
    >
      <span className={cn('relative block h-34 w-full overflow-hidden rounded-t-2xl', tom?.bg ?? 'bg-soft')}>
        <span aria-hidden="true" className={cn('absolute top-3.5 left-4 font-mono text-[34px] font-medium', tom?.fg ?? 'text-ink-3')}>
          {sigla(p.id)}
        </span>
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 type-micro font-normal text-ink-2">
          <ImageIcon aria-hidden="true" className="size-3" />
          {p.imagens.length ? plural(p.imagens.length, 'imagem', 'imagens') : 'Sem capa'}
        </span>
      </span>
      <span className="flex w-full flex-col gap-2.5 rounded-b-2xl border border-t-0 border-line bg-card px-4 pt-3.5 pb-4">
        <span className="type-caption text-ink-3">{ROTULO_STATUS_PROJETO[p.status]}</span>
        <span className="font-mono text-[16px] text-ink">{p.id}</span>
        {p.descricao && <span className="type-small text-ink-2">{p.descricao}</span>}
        <span className="h-px bg-divider" />
        <span className="flex items-center justify-between gap-2">
          <span className="flex flex-wrap gap-1">
            {p.trilhas.map((id) => {
              const t = trilhaDe.get(id)
              return t ? <TrilhaChip key={id} cor={t.cor} rotulo={id} titulo={t.nome} estilo="mono" /> : null
            })}
          </span>
          <span className="type-caption whitespace-nowrap text-ink-2">{plural(p.evidencias.length, 'evidência')}</span>
        </span>
      </span>
    </button>
  )
}

function Detalhe({ projeto: p, trilhaDe, onEditar }: { projeto: Projeto; trilhaDe: Map<string, Trilha>; onEditar: () => void }) {
  return (
    <aside aria-labelledby="titulo-projeto" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 rounded-2xl border border-line bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="type-caption text-ink-3">{p.pasta}</span>
          <h2 id="titulo-projeto" className="m-0 font-mono text-[20px] font-medium">
            {p.id}
          </h2>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-xs bg-soft px-2 py-1 type-caption text-ink-2">{ROTULO_STATUS_PROJETO[p.status]}</span>
          <IconButton rotulo={`Editar o projeto ${p.projeto}`} onClick={onEditar}>
            <Pencil aria-hidden="true" className="size-4" />
          </IconButton>
        </span>
      </div>
      {p.descricao && <p className="m-0 type-body text-ink-2">{p.descricao}</p>}

      <div className="flex flex-col gap-2">
        <h3 className="m-0 type-caption font-normal text-ink-3">Imagens · {p.imagens.length} de 6</h3>
        {p.imagens.length ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 type-small">
            {p.imagens.map((img, i) => (
              <li key={img} className="flex items-center gap-2">
                <ImageIcon aria-hidden="true" className="size-4 text-ink-3" />
                <span className="type-mono">{img}</span>
                {i === 0 && <span className="type-caption text-ink-3">capa</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 type-small text-ink-3">Nenhuma imagem. O envio de imagens chega depois da decisão do ADR-004.</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="m-0 pb-1 type-caption font-normal text-ink-3">Evidências no segundo cérebro</h3>
        {p.evidencias.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {p.evidencias.map((e) => (
              <li key={e} className="flex items-center gap-2.5 border-t border-divider py-2 type-small">
                <FileText aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
                <span className="min-w-0 break-words">{e}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 type-small text-ink-3">Nenhuma evidência ligada ainda. Adicione notas do vault em “Editar”.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="m-0 type-caption font-normal text-ink-3">Desenvolve as trilhas</h3>
        <div className="flex flex-wrap gap-1.5">
          {p.trilhas.map((id) => {
            const t = trilhaDe.get(id)
            return t ? <TrilhaChip key={id} cor={t.cor} rotulo={t.nome} to={`/trilhas/${id}`} /> : null
          })}
        </div>
      </div>
    </aside>
  )
}
