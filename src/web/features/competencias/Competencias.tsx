// Competências (F6, F11, F12): as 18 competências do framework com nível
// atual (autoavaliação do ciclo), meta, trilhas e status. Só leitura até a
// Fase 4: os pontos e o status ainda não gravam no vault.

import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { COMPETENCIAS, ESCALA, NOME_NIVEL } from '../../../domain/framework'
import { lacuna, maturidadeMeta, statusCompetencia } from '../../../domain/metrics'
import { PILARES, STATUS_COMPETENCIA, type Competencia, type Nivel, type Pilar, type Trilha } from '../../../domain/types'
import { useCiclo, useTrilhas } from '../../api/queries'
import { cn } from '../../components/cn'
import { AvisoArquivos, EstadoConsulta } from '../../components/EstadoConsulta'
import { LevelDots } from '../../components/LevelDots'
import { SegmentedTabs } from '../../components/SegmentedTabs'
import { StatusPill } from '../../components/StatusPill'
import { TOM_PILAR, TOM_STATUS_COMPETENCIA } from '../../components/tones'
import { TrilhaChip } from '../../components/TrilhaChip'
import { Painel } from '../../layout/AppShell'
import { PageHeader, TituloTela } from '../../layout/PageHeader'
import { escolha, useParametros } from '../../useParametros'

type FiltroPilar = 'todos' | Pilar
const ABAS: { valor: FiltroPilar; label: string }[] = [
  { valor: 'todos', label: 'Todas' },
  { valor: 'comportamental', label: 'Comportamentais' },
  { valor: 'ferramentas', label: 'Ferramentas' },
  { valor: 'tecnica', label: 'Técnicas' },
]

/** Texto esperado no nível-alvo (comportamental e ferramentas) ou descrição da área (técnica). */
function descricao(c: Competencia, alvo: Nivel): string {
  return c.esperado?.[alvo] ?? c.descricao ?? ''
}

export function Competencias() {
  const ciclo = useCiclo()
  const trilhas = useTrilhas()
  const [params, alterar] = useParametros()

  const pilar = escolha(params.get('pilar'), ['todos', ...PILARES], 'todos')
  const listaTrilhas = useMemo(() => trilhas.data?.itens ?? [], [trilhas.data])
  const trilha = escolha(
    params.get('trilha'),
    listaTrilhas.map((t) => t.id),
    'todas',
  )
  const busca = params.get('busca') ?? ''

  const c = ciclo.data?.ciclo ?? null
  const alvo: Nivel = c?.nivelAlvo ?? 'pleno'
  const meta = maturidadeMeta(alvo)

  const trilhasDe = useMemo(() => {
    const m = new Map<string, Trilha[]>()
    for (const t of listaTrilhas) for (const id of t.competencias) m.set(id, [...(m.get(id) ?? []), t])
    return m
  }, [listaTrilhas])

  const linhas = COMPETENCIAS.map((comp, i) => {
    const av = c?.autoavaliacao[comp.id]
    return {
      comp,
      num: String(i + 1).padStart(2, '0'),
      nivel: av?.nivel ?? null,
      status: statusCompetencia(av, alvo),
      sugerido: !av?.status,
      trilhas: trilhasDe.get(comp.id) ?? [],
    }
  })

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const visiveis = linhas.filter(
    (l) =>
      (pilar === 'todos' || l.comp.pilar === pilar) &&
      (trilha === 'todas' || l.trilhas.some((t) => t.id === trilha)) &&
      (!termo || l.comp.nome.toLocaleLowerCase('pt-BR').includes(termo)),
  )

  const carregando = ciclo.isPending || trilhas.isPending
  const erro = ciclo.error ?? trilhas.error

  return (
    <>
      <PageHeader trilha={['Painel', 'Competências']}>
        {c && (
          <span className="inline-flex min-h-10 items-center rounded-md border border-line-strong bg-card px-3 type-small text-ink-2">
            Autoavaliação · ciclo {c.id}
          </span>
        )}
      </PageHeader>
      <Painel>
        <TituloTela
          titulo="Competências"
          subtitulo={`As ${COMPETENCIAS.length} competências do guia de carreira, com o nível atual da autoavaliação e a meta do ciclo: ${NOME_NIVEL[alvo]}.`}
        >
          <ul aria-label="Resumo por status" className="m-0 flex list-none flex-wrap gap-2 p-0">
            {[...STATUS_COMPETENCIA].reverse().map((s) => (
              <li key={s} className="flex min-w-28 flex-col gap-0.5 rounded-lg border border-line bg-card px-3.5 py-2.5">
                <span className="text-[22px] leading-tight font-semibold">{linhas.filter((l) => l.status === s).length}</span>
                <span className="inline-flex items-center gap-1.5 type-caption text-ink-2">
                  <span aria-hidden="true" className={cn('size-2 rounded-full', TOM_STATUS_COMPETENCIA[s].dot)} />
                  {TOM_STATUS_COMPETENCIA[s].label}
                </span>
              </li>
            ))}
          </ul>
        </TituloTela>

        <EstadoConsulta carregando={carregando} erro={erro} />
        {ciclo.data && !c && <p className="m-0 type-small text-ink-2">Nenhum ciclo encontrado: a autoavaliação aparece quando existir uma nota em Ciclos/.</p>}
        {ciclo.data && <AvisoArquivos erros={[...ciclo.data.erros, ...(trilhas.data?.erros ?? [])]} />}

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-10 w-65 max-w-full items-center gap-2 rounded-md border border-line-strong bg-card px-3 text-ink-3 focus-within:outline-2 focus-within:outline-ink">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">Buscar competência</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => alterar({ busca: e.target.value })}
              placeholder="Buscar competência…"
              className="min-w-0 flex-1 border-0 bg-transparent type-body text-ink outline-none placeholder:text-ink-3"
            />
          </label>
          <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line-strong bg-card pr-1 pl-3 type-small text-ink-3">
            Trilha:
            <select
              value={trilha}
              onChange={(e) => alterar({ trilha: e.target.value === 'todas' ? null : e.target.value })}
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
        </div>

        <SegmentedTabs
          rotulo="Filtrar por pilar"
          valor={pilar}
          onChange={(v) => alterar({ pilar: v === 'todos' ? null : v })}
          abas={ABAS.map((a) => ({ ...a, contagem: a.valor === 'todos' ? COMPETENCIAS.length : COMPETENCIAS.filter((x) => x.pilar === a.valor).length }))}
        >
          <div role="region" aria-label="Tabela de competências" tabIndex={0} className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-250 border-collapse type-body">
              <thead>
                <tr className="bg-muted text-left text-ink-2">
                  <th scope="col" className="w-11 px-4 py-3.5 font-medium">
                    #
                  </th>
                  <th scope="col" className="px-2 py-3.5 font-medium">
                    Competência
                  </th>
                  <th scope="col" className="px-2 py-3.5 font-medium">
                    Pilar
                  </th>
                  <th scope="col" className="px-2 py-3.5 font-medium">
                    Trilhas
                  </th>
                  <th scope="col" className="px-2 py-3.5 font-medium">
                    Nível atual
                  </th>
                  <th scope="col" className="px-2 py-3.5 font-medium">
                    Meta
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-2 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => {
                  const escala = ESCALA[l.comp.pilar]
                  const falta = lacuna(l.nivel ?? undefined, alvo)
                  return (
                    <tr key={l.comp.id} className="border-t border-divider align-middle">
                      <td className="px-4 py-3.5 type-mono text-ink-3">{l.num}</td>
                      <td className="max-w-85 px-2 py-3.5">
                        <div className="font-semibold">{l.comp.nome}</div>
                        <div className="mt-0.5 type-caption text-ink-3">{descricao(l.comp, alvo)}</div>
                      </td>
                      <td className="px-2 py-3.5">
                        <span className="inline-flex items-center gap-1.5 type-caption whitespace-nowrap">
                          <span aria-hidden="true" className={cn('size-2 rounded-full', TOM_PILAR[l.comp.pilar].dot)} />
                          {TOM_PILAR[l.comp.pilar].label}
                        </span>
                      </td>
                      <td className="px-2 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {l.trilhas.map((t) => (
                            <TrilhaChip key={t.id} cor={t.cor} rotulo={t.id} titulo={t.nome} estilo="mono" to={`/trilhas/${t.id}`} />
                          ))}
                          {!l.trilhas.length && <span className="type-caption text-meta-atrasada-fg">sem trilha</span>}
                        </div>
                      </td>
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2">
                          <LevelDots nome={l.comp.nome} pilar={l.comp.pilar} nivel={l.nivel} meta={meta} />
                          <span className="type-caption whitespace-nowrap text-ink-2">{l.nivel ? escala[l.nivel - 1] : 'Sem registro'}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3.5">
                        <span
                          className={cn(
                            'rounded-xs px-2 py-1 type-caption whitespace-nowrap',
                            falta ? 'bg-comp-em-evolucao-bg text-comp-em-evolucao-fg' : 'bg-soft text-ink-2',
                          )}
                        >
                          {escala[meta - 1]} · {falta ? `falta ${falta}` : 'atingida'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 pl-2">
                        <span className="inline-flex flex-col items-start gap-0.5">
                          <StatusPill variante="competencia-status" valor={l.status} />
                          {l.sugerido && <span className="type-micro font-normal text-ink-3">sugerido pelo nível</span>}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!visiveis.length && <p className="m-0 p-8 text-center type-body text-ink-3">Nenhuma competência encontrada com esses filtros.</p>}
          </div>
        </SegmentedTabs>

        <p className="m-0 type-caption text-ink-3">
          Escala: comportamentais e ferramentas em Júnior · Pleno · Sênior; técnicas em Baixo · Médio · Alto · Especialidade. O ponto cheio marca o
          nível atual e o ponto com contorno, a meta. A autoavaliação é editada no frontmatter do ciclo até a edição pelo painel chegar.
        </p>
      </Painel>
    </>
  )
}
