// Formulários de criar e editar cada entidade do PDI pelo painel (ADR-007).
// As regras (campos obrigatórios, referências, IDs) ficam no servidor; aqui
// só há o mínimo para o formulário fazer sentido (required, tipos de input).

import { COMPETENCIAS, ESCALA, competencia, maturidadeMaxima, NOME_NIVEL } from '../../../domain/framework'
import {
  CORES_TRILHA,
  NIVEIS,
  PRIORIDADES,
  STATUS_ACAO,
  STATUS_COMPETENCIA,
  STATUS_PROJETO,
  STATUS_REUNIAO,
  TIPOS_FEEDBACK,
  type Acao,
  type Ciclo,
  type CorTrilha,
  type Feedback,
  type ItemChecklist,
  type Maturidade,
  type Meta,
  type Nivel,
  type Prioridade,
  type Projeto,
  type Reuniao,
  type StatusAcao,
  type StatusCompetencia,
  type StatusProjeto,
  type StatusReuniao,
  type TipoFeedback,
  type Trilha,
} from '../../../domain/types'
import { useAcoes, useCiclo, useFeedbacks, useProjetos, useReunioes, useTrilhas } from '../../api/queries'
import { Campo, CLASSE_CAMPO, EditorChecklist, Linha, Marcacoes } from '../../components/Campos'
import { cn } from '../../components/cn'
import { ROTULO_STATUS_PROJETO, TOM_PILAR, TOM_PRIORIDADE, TOM_STATUS_ACAO, TOM_STATUS_COMPETENCIA, TOM_TIPO_FEEDBACK, TOM_TRILHA } from '../../components/tones'
import { dataCurta, linhasParaLista } from '../../format'
import { DialogoEntidade } from './DialogoEntidade'

interface Base {
  aberto: boolean
  onFechar: () => void
}

const ROTULO_STATUS_REUNIAO: Record<StatusReuniao, string> = { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada' }
const semVazios = (itens: ItemChecklist[]) => itens.map((i) => ({ ...i, texto: i.texto.trim() })).filter((i) => i.texto)
const ouNulo = (s: string) => (s.trim() ? s.trim() : null)

/** Opções de competência: as da trilha primeiro, depois as outras. */
function OpcoesCompetencia({ trilha }: { trilha?: Pick<Trilha, 'competencias' | 'id'> }) {
  const daTrilha = new Set(trilha?.competencias ?? [])
  const grupo = (lista: typeof COMPETENCIAS) => lista.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)
  if (!daTrilha.size) return <>{grupo(COMPETENCIAS)}</>
  return (
    <>
      <optgroup label={`Da trilha ${trilha!.id}`}>{grupo(COMPETENCIAS.filter((c) => daTrilha.has(c.id)))}</optgroup>
      <optgroup label="Outras">{grupo(COMPETENCIAS.filter((c) => !daTrilha.has(c.id)))}</optgroup>
    </>
  )
}

// ---------- Ação ----------

interface ValoresAcao {
  titulo: string
  trilha: string
  competenciaId: string
  status: StatusAcao
  prioridade: Prioridade
  prazo: string
  marcos: ItemChecklist[]
  evidencias: string
}

export function DialogoAcao({ aberto, onFechar, acao, trilhaPadrao }: Base & { acao?: Acao; trilhaPadrao?: string }) {
  const trilhas = useTrilhas().data?.itens ?? []
  const ciclo = useCiclo().data?.ciclo
  const trilhaInicial = acao?.trilha ?? trilhaPadrao ?? trilhas[0]?.id ?? ''
  return (
    <DialogoEntidade<ValoresAcao>
      aberto={aberto}
      onFechar={onFechar}
      entidade="acoes"
      titulo={acao ? `Editar ${acao.id}` : 'Nova ação'}
      descricao={acao ? undefined : ciclo ? `Entra no ciclo ${ciclo.id}, na coluna escolhida do quadro.` : 'Crie um ciclo antes de registrar ações.'}
      existente={acao && { chave: acao.id, versao: acao.versao, nome: `a ação ${acao.id}` }}
      efeitoExclusao="os marcos vão junto e a ação sai das metas que a listam."
      inicial={{
        titulo: acao?.titulo ?? '',
        trilha: trilhaInicial,
        competenciaId: acao?.competenciaId ?? trilhas.find((t) => t.id === trilhaInicial)?.competencias[0] ?? COMPETENCIAS[0]!.id,
        status: acao?.status ?? 'nao-iniciado',
        prioridade: acao?.prioridade ?? 'media',
        prazo: acao?.prazo ?? '',
        marcos: acao?.marcos ?? [],
        evidencias: acao?.evidencias.join('\n') ?? '',
      }}
      corpo={(v) => ({
        titulo: v.titulo,
        trilha: v.trilha,
        competenciaId: v.competenciaId,
        status: v.status,
        prioridade: v.prioridade,
        prazo: ouNulo(v.prazo),
        marcos: semVazios(v.marcos),
        evidencias: linhasParaLista(v.evidencias),
        ...(!acao && { ciclo: ciclo?.id ?? '' }),
      })}
      aviso={(g) => (acao ? `${(g as Acao).id} atualizada.` : `${(g as Acao).id} criada em ${TOM_STATUS_ACAO[(g as Acao).status].label}.`)}
      campos={(v, alterar) => (
        <>
          <Campo rotulo="Título">
            <input className={CLASSE_CAMPO} required value={v.titulo} onChange={(e) => alterar({ titulo: e.target.value })} />
          </Campo>
          <Linha>
            <Campo rotulo="Trilha">
              <select className={CLASSE_CAMPO} value={v.trilha} onChange={(e) => alterar({ trilha: e.target.value })}>
                {trilhas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} · {t.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Competência">
              <select className={CLASSE_CAMPO} value={v.competenciaId} onChange={(e) => alterar({ competenciaId: e.target.value })}>
                <OpcoesCompetencia trilha={trilhas.find((t) => t.id === v.trilha)} />
              </select>
            </Campo>
          </Linha>
          <Linha>
            <Campo rotulo="Status">
              <select className={CLASSE_CAMPO} value={v.status} onChange={(e) => alterar({ status: e.target.value as StatusAcao })}>
                {STATUS_ACAO.map((s) => (
                  <option key={s} value={s}>
                    {TOM_STATUS_ACAO[s].label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Prioridade">
              <select className={CLASSE_CAMPO} value={v.prioridade} onChange={(e) => alterar({ prioridade: e.target.value as Prioridade })}>
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {TOM_PRIORIDADE[p].label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Prazo" opcional>
              <input type="date" className={CLASSE_CAMPO} value={v.prazo} onChange={(e) => alterar({ prazo: e.target.value })} />
            </Campo>
          </Linha>
          <EditorChecklist legenda="Marcos" rotuloItem="Marco" itens={v.marcos} onChange={(marcos) => alterar({ marcos })} />
          <Campo rotulo="Evidências" opcional dica="Uma nota do vault por linha, como [[noctus/Architecture]].">
            <textarea className={cn(CLASSE_CAMPO, 'min-h-20 py-2')} value={v.evidencias} onChange={(e) => alterar({ evidencias: e.target.value })} />
          </Campo>
        </>
      )}
    />
  )
}

// ---------- Meta ----------

interface ValoresMeta {
  titulo: string
  trilha: string
  reuniao: string
  feedback: string
  prazo: string
  acoes: string[]
  progressoManual: string
  concluidaEm: string
}

export function DialogoMeta({ aberto, onFechar, meta, padrao }: Base & { meta?: Meta; padrao?: Partial<ValoresMeta> }) {
  const trilhas = useTrilhas().data?.itens ?? []
  const reunioes = useReunioes().data?.itens ?? []
  const feedbacks = useFeedbacks().data?.itens ?? []
  const acoes = useAcoes().data?.itens ?? []
  return (
    <DialogoEntidade<ValoresMeta>
      aberto={aberto}
      onFechar={onFechar}
      entidade="metas"
      titulo={meta ? `Editar ${meta.id}` : padrao?.feedback ? `Transformar ${padrao.feedback} em meta` : 'Nova meta'}
      descricao={meta ? undefined : 'Uma meta nasce numa 1:1 e acompanha as ações ligadas a ela.'}
      existente={meta && { chave: meta.id, versao: meta.versao, nome: `a meta ${meta.id}` }}
      efeitoExclusao="o feedback e o bloco de estudo ligados a ela ficam sem meta."
      inicial={{
        titulo: meta?.titulo ?? '',
        trilha: meta?.trilha ?? trilhas[0]?.id ?? '',
        reuniao: meta?.reuniao ?? reunioes[0]?.data ?? '',
        feedback: meta?.feedback ?? '',
        prazo: meta?.prazo ?? '',
        acoes: meta?.acoes ?? [],
        progressoManual: meta?.progressoManual?.toString() ?? '',
        concluidaEm: meta?.concluidaEm ?? '',
        ...padrao,
      }}
      corpo={(v) => ({
        titulo: v.titulo,
        trilha: v.trilha,
        reuniao: v.reuniao,
        feedback: ouNulo(v.feedback),
        prazo: v.prazo,
        acoes: v.acoes,
        progressoManual: v.progressoManual.trim() === '' ? null : Number(v.progressoManual),
        concluidaEm: ouNulo(v.concluidaEm),
      })}
      aviso={(g) => `${(g as Meta).id} ${meta ? 'atualizada' : 'criada'}.`}
      campos={(v, alterar) => {
        const daTrilha = acoes.filter((a) => a.trilha === v.trilha || v.acoes.includes(a.id))
        return (
          <>
            <Campo rotulo="Título">
              <input className={CLASSE_CAMPO} required value={v.titulo} onChange={(e) => alterar({ titulo: e.target.value })} />
            </Campo>
            <Linha>
              <Campo rotulo="Trilha">
                <select className={CLASSE_CAMPO} value={v.trilha} onChange={(e) => alterar({ trilha: e.target.value })}>
                  {trilhas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} · {t.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="1:1 de origem">
                <select className={CLASSE_CAMPO} required value={v.reuniao} onChange={(e) => alterar({ reuniao: e.target.value, feedback: '' })}>
                  {!reunioes.length && <option value="">Registre uma 1:1 antes</option>}
                  {reunioes.map((r) => (
                    <option key={r.data} value={r.data}>
                      {dataCurta(r.data)}
                      {r.tema ? ` · ${r.tema}` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
            </Linha>
            <Linha>
              <Campo rotulo="Prazo">
                <input type="date" required className={CLASSE_CAMPO} value={v.prazo} onChange={(e) => alterar({ prazo: e.target.value })} />
              </Campo>
              <Campo rotulo="Feedback de origem" opcional>
                <select className={CLASSE_CAMPO} value={v.feedback} onChange={(e) => alterar({ feedback: e.target.value })}>
                  <option value="">Nenhum</option>
                  {feedbacks
                    .filter((f) => f.reuniao === v.reuniao || f.id === v.feedback)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.id} · {competencia(f.competenciaId)?.nome ?? f.competenciaId}
                      </option>
                    ))}
                </select>
              </Campo>
            </Linha>
            <Marcacoes
              legenda="Ações ligadas"
              dica="O progresso da meta é o das ações marcadas."
              opcoes={daTrilha.map((a) => ({ valor: a.id, label: `${a.id} · ${a.titulo}` }))}
              valores={v.acoes}
              onChange={(acoes) => alterar({ acoes })}
            />
            <Linha>
              <Campo rotulo="Progresso manual (%)" opcional dica="Só para metas sem ações ligadas.">
                <input type="number" min={0} max={100} className={CLASSE_CAMPO} value={v.progressoManual} onChange={(e) => alterar({ progressoManual: e.target.value })} />
              </Campo>
              <Campo rotulo="Concluída em" opcional>
                <input type="date" className={CLASSE_CAMPO} value={v.concluidaEm} onChange={(e) => alterar({ concluidaEm: e.target.value })} />
              </Campo>
            </Linha>
          </>
        )
      }}
    />
  )
}

// ---------- Reunião 1:1 ----------

interface ValoresReuniao {
  data: string
  inicio: string
  fim: string
  tema: string
  status: StatusReuniao
  pauta: ItemChecklist[]
}

export function DialogoReuniao({ aberto, onFechar, reuniao, dataPadrao }: Base & { reuniao?: Reuniao; dataPadrao?: string }) {
  return (
    <DialogoEntidade<ValoresReuniao>
      aberto={aberto}
      onFechar={onFechar}
      entidade="reunioes"
      titulo={reuniao ? `Editar a 1:1 de ${dataCurta(reuniao.data)}` : 'Nova 1:1'}
      existente={reuniao && { chave: reuniao.data, versao: reuniao.versao, nome: `a 1:1 de ${dataCurta(reuniao.data)}` }}
      efeitoExclusao="a pauta vai junto. Uma 1:1 com feedbacks ou metas não pode ser excluída; marque-a como cancelada."
      inicial={{
        data: reuniao?.data ?? dataPadrao ?? '',
        inicio: reuniao?.inicio ?? '10:00',
        fim: reuniao?.fim ?? '10:45',
        tema: reuniao?.tema ?? '',
        status: reuniao?.status ?? 'agendada',
        pauta: reuniao?.pauta ?? [],
      }}
      corpo={(v) => ({ data: v.data, inicio: v.inicio, fim: v.fim, tema: ouNulo(v.tema), status: v.status, pauta: semVazios(v.pauta) })}
      aviso={(g) => `1:1 de ${dataCurta((g as Reuniao).data)} ${reuniao ? 'atualizada' : 'registrada'}.`}
      campos={(v, alterar) => (
        <>
          <Linha>
            <Campo rotulo="Data" dica={reuniao ? 'Mudar a data remarca a 1:1 com pauta, feedbacks e metas.' : undefined}>
              <input type="date" required className={CLASSE_CAMPO} value={v.data} onChange={(e) => alterar({ data: e.target.value })} />
            </Campo>
            <Campo rotulo="Início">
              <input type="time" required className={CLASSE_CAMPO} value={v.inicio} onChange={(e) => alterar({ inicio: e.target.value })} />
            </Campo>
            <Campo rotulo="Fim">
              <input type="time" required className={CLASSE_CAMPO} value={v.fim} onChange={(e) => alterar({ fim: e.target.value })} />
            </Campo>
          </Linha>
          <Linha>
            <Campo rotulo="Tema" opcional>
              <input className={CLASSE_CAMPO} value={v.tema} onChange={(e) => alterar({ tema: e.target.value })} />
            </Campo>
            <Campo rotulo="Status">
              <select className={CLASSE_CAMPO} value={v.status} onChange={(e) => alterar({ status: e.target.value as StatusReuniao })}>
                {STATUS_REUNIAO.map((s) => (
                  <option key={s} value={s}>
                    {ROTULO_STATUS_REUNIAO[s]}
                  </option>
                ))}
              </select>
            </Campo>
          </Linha>
          <EditorChecklist legenda="Pauta" rotuloItem="Item" itens={v.pauta} onChange={(pauta) => alterar({ pauta })} />
        </>
      )}
    />
  )
}

// ---------- Feedback ----------

interface ValoresFeedback {
  reuniao: string
  tipo: TipoFeedback
  competenciaId: string
  texto: string
}

export function DialogoFeedback({ aberto, onFechar, feedback, reuniaoPadrao }: Base & { feedback?: Feedback; reuniaoPadrao?: string }) {
  const reunioes = useReunioes().data?.itens ?? []
  return (
    <DialogoEntidade<ValoresFeedback>
      aberto={aberto}
      onFechar={onFechar}
      entidade="feedbacks"
      titulo={feedback ? `Editar ${feedback.id}` : 'Registrar feedback'}
      descricao={feedback ? undefined : 'O que a liderança observou numa 1:1, ligado a uma competência.'}
      existente={feedback && { chave: feedback.id, versao: feedback.versao, nome: `o feedback ${feedback.id}` }}
      efeitoExclusao={feedback?.meta ? `a meta ${feedback.meta} continua, sem o feedback de origem.` : undefined}
      inicial={{
        reuniao: feedback?.reuniao ?? reuniaoPadrao ?? reunioes.find((r) => r.status === 'realizada')?.data ?? reunioes[0]?.data ?? '',
        tipo: feedback?.tipo ?? 'reconhecimento',
        competenciaId: feedback?.competenciaId ?? COMPETENCIAS[0]!.id,
        texto: feedback?.texto ?? '',
      }}
      corpo={(v) => v}
      aviso={(g) => `${(g as Feedback).id} ${feedback ? 'atualizado' : 'registrado'}.`}
      campos={(v, alterar) => (
        <>
          <Linha>
            <Campo rotulo="1:1">
              <select className={CLASSE_CAMPO} required value={v.reuniao} onChange={(e) => alterar({ reuniao: e.target.value })}>
                {!reunioes.length && <option value="">Registre uma 1:1 antes</option>}
                {reunioes.map((r) => (
                  <option key={r.data} value={r.data}>
                    {dataCurta(r.data)}
                    {r.tema ? ` · ${r.tema}` : ''}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Tipo">
              <select className={CLASSE_CAMPO} value={v.tipo} onChange={(e) => alterar({ tipo: e.target.value as TipoFeedback })}>
                {TIPOS_FEEDBACK.map((t) => (
                  <option key={t} value={t}>
                    {TOM_TIPO_FEEDBACK[t].label}
                  </option>
                ))}
              </select>
            </Campo>
          </Linha>
          <Campo rotulo="Competência">
            <select className={CLASSE_CAMPO} value={v.competenciaId} onChange={(e) => alterar({ competenciaId: e.target.value })}>
              <OpcoesCompetencia />
            </select>
          </Campo>
          <Campo rotulo="Texto">
            <textarea className={cn(CLASSE_CAMPO, 'min-h-28 py-2')} required value={v.texto} onChange={(e) => alterar({ texto: e.target.value })} />
          </Campo>
        </>
      )}
    />
  )
}

// ---------- Projeto ----------

interface ValoresProjeto {
  projeto: string
  pasta: string
  descricao: string
  trilhas: string[]
  status: StatusProjeto
  evidencias: string
}

export function DialogoProjeto({ aberto, onFechar, projeto }: Base & { projeto?: Projeto }) {
  const trilhas = useTrilhas().data?.itens ?? []
  const pastas = [...new Set((useProjetos().data?.itens ?? []).map((p) => p.pasta))]
  return (
    <DialogoEntidade<ValoresProjeto>
      aberto={aberto}
      onFechar={onFechar}
      entidade="projetos"
      titulo={projeto ? `Editar ${projeto.projeto}` : 'Novo projeto'}
      descricao={projeto ? undefined : 'Um projeto usado como evidência do PDI.'}
      existente={projeto && { chave: projeto.id, versao: projeto.versao, nome: `o projeto ${projeto.projeto}` }}
      inicial={{
        projeto: projeto?.projeto ?? '',
        pasta: projeto?.pasta ?? pastas[0] ?? '',
        descricao: projeto?.descricao ?? '',
        trilhas: projeto?.trilhas ?? [],
        status: projeto?.status ?? 'ativo',
        evidencias: projeto?.evidencias.join('\n') ?? '',
      }}
      corpo={(v) => ({ ...v, evidencias: linhasParaLista(v.evidencias) })}
      aviso={(g) => `Projeto ${(g as Projeto).projeto} ${projeto ? 'atualizado' : 'criado'}.`}
      campos={(v, alterar) => (
        <>
          <Linha>
            <Campo rotulo="Projeto" dica="Nome da nota do projeto em 02 Projetos/.">
              <input className={CLASSE_CAMPO} required value={v.projeto} onChange={(e) => alterar({ projeto: e.target.value })} />
            </Campo>
            <Campo rotulo="Pasta" dica="Agrupa os projetos na tela.">
              <input className={CLASSE_CAMPO} required list="pastas-projeto" value={v.pasta} onChange={(e) => alterar({ pasta: e.target.value })} />
              <datalist id="pastas-projeto">
                {pastas.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Campo>
          </Linha>
          <Campo rotulo="Descrição" opcional>
            <textarea className={cn(CLASSE_CAMPO, 'min-h-20 py-2')} value={v.descricao} onChange={(e) => alterar({ descricao: e.target.value })} />
          </Campo>
          <Campo rotulo="Status">
            <select className={CLASSE_CAMPO} value={v.status} onChange={(e) => alterar({ status: e.target.value as StatusProjeto })}>
              {STATUS_PROJETO.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_PROJETO[s]}
                </option>
              ))}
            </select>
          </Campo>
          <Marcacoes legenda="Trilhas" opcoes={trilhas.map((t) => ({ valor: t.id, label: `${t.id} · ${t.nome}` }))} valores={v.trilhas} onChange={(trilhas) => alterar({ trilhas })} />
          <Campo rotulo="Evidências" opcional dica="Uma nota do vault por linha.">
            <textarea className={cn(CLASSE_CAMPO, 'min-h-20 py-2')} value={v.evidencias} onChange={(e) => alterar({ evidencias: e.target.value })} />
          </Campo>
        </>
      )}
    />
  )
}

// ---------- Trilha ----------

interface ValoresTrilha {
  nome: string
  descricao: string
  cor: CorTrilha
  competencias: string[]
}

export function DialogoTrilha({ aberto, onFechar, trilha }: Base & { trilha?: Trilha }) {
  const total = useTrilhas().data?.itens.length ?? 0
  return (
    <DialogoEntidade<ValoresTrilha>
      aberto={aberto}
      onFechar={onFechar}
      entidade="trilhas"
      titulo={trilha ? `Editar ${trilha.id}` : 'Nova trilha'}
      descricao={trilha ? undefined : 'Uma trilha agrupa ações que desenvolvem um conjunto de competências.'}
      existente={trilha && { chave: trilha.id, versao: trilha.versao, nome: `a trilha ${trilha.id}` }}
      efeitoExclusao="só é possível excluir uma trilha sem ações e sem metas."
      inicial={{
        nome: trilha?.nome ?? '',
        descricao: trilha?.descricao ?? '',
        cor: trilha?.cor ?? CORES_TRILHA[total % CORES_TRILHA.length]!,
        competencias: trilha?.competencias ?? [],
      }}
      corpo={(v) => v}
      aviso={(g) => `Trilha ${(g as Trilha).id} ${trilha ? 'atualizada' : 'criada'}.`}
      campos={(v, alterar) => (
        <>
          <Campo rotulo="Nome">
            <input className={CLASSE_CAMPO} required value={v.nome} onChange={(e) => alterar({ nome: e.target.value })} />
          </Campo>
          <Campo rotulo="Descrição" opcional>
            <textarea className={cn(CLASSE_CAMPO, 'min-h-20 py-2')} value={v.descricao} onChange={(e) => alterar({ descricao: e.target.value })} />
          </Campo>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 p-0 type-small font-medium">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {CORES_TRILHA.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="cor-trilha" className="peer sr-only" checked={v.cor === c} onChange={() => alterar({ cor: c })} />
                  <span
                    className={cn(
                      'flex size-10 pointer-coarse:size-11 items-center justify-center rounded-md border-2 border-transparent type-mono peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
                      TOM_TRILHA[c].bg,
                      TOM_TRILHA[c].fg,
                    )}
                  >
                    {c}
                    <span className="sr-only">Cor {c}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Marcacoes
            legenda="Competências desenvolvidas"
            dica="Toda competência do framework deve estar em pelo menos uma trilha."
            opcoes={COMPETENCIAS.map((c) => ({
              valor: c.id,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', TOM_PILAR[c.pilar].dot)} />
                  {c.nome}
                </span>
              ),
            }))}
            valores={v.competencias}
            onChange={(competencias) => alterar({ competencias })}
          />
        </>
      )}
    />
  )
}

// ---------- Autoavaliação de uma competência (parte do ciclo) ----------

interface ValoresAutoavaliacao {
  nivel: string
  status: '' | StatusCompetencia
}

export function DialogoAutoavaliacao({ aberto, onFechar, ciclo, competenciaId }: Base & { ciclo: Ciclo; competenciaId: string }) {
  const comp = competencia(competenciaId)
  const atual = ciclo.autoavaliacao[competenciaId]
  const escala = comp ? ESCALA[comp.pilar] : []
  return (
    <DialogoEntidade<ValoresAutoavaliacao>
      aberto={aberto}
      onFechar={onFechar}
      entidade="ciclos"
      titulo={comp?.nome ?? competenciaId}
      descricao={`Autoavaliação no ciclo ${ciclo.id}.`}
      existente={{ chave: ciclo.id, versao: ciclo.versao, nome: `o ciclo ${ciclo.id}` }}
      permitirExclusao={false}
      inicial={{ nivel: atual ? String(atual.nivel) : '', status: atual?.status ?? '' }}
      corpo={(v) => ({
        autoavaliacao: { [competenciaId]: v.nivel ? { nivel: Number(v.nivel) as Maturidade, status: v.status || null } : null },
      })}
      aviso={() => `Autoavaliação de ${comp?.nome ?? competenciaId} salva.`}
      campos={(v, alterar) => (
        <>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 p-0 type-small font-medium">Nível atual</legend>
            {['', ...escala.slice(0, comp ? maturidadeMaxima(comp.pilar) : 0).map((_, i) => String(i + 1))].map((n) => (
              <label key={n} className="flex min-h-9 pointer-coarse:min-h-11 items-center gap-2 rounded-sm px-1 type-small hover:bg-muted">
                <input type="radio" name="nivel" className="size-4 accent-ink" checked={v.nivel === n} onChange={() => alterar({ nivel: n })} />
                {n ? `${n} · ${escala[Number(n) - 1]}` : 'Sem registro'}
              </label>
            ))}
          </fieldset>
          <Campo rotulo="Status" dica="Automático usa a sugestão pelo nível e pela meta do ciclo.">
            <select className={CLASSE_CAMPO} value={v.status} disabled={!v.nivel} onChange={(e) => alterar({ status: e.target.value as ValoresAutoavaliacao['status'] })}>
              <option value="">Automático</option>
              {STATUS_COMPETENCIA.map((s) => (
                <option key={s} value={s}>
                  {TOM_STATUS_COMPETENCIA[s].label}
                </option>
              ))}
            </select>
          </Campo>
        </>
      )}
    />
  )
}

// ---------- Ciclo ----------

interface ValoresCiclo {
  id: string
  inicio: string
  fim: string
  nivelAtual: Nivel
  nivelAlvo: Nivel
}

export function DialogoCiclo({ aberto, onFechar }: Base) {
  return (
    <DialogoEntidade<ValoresCiclo>
      aberto={aberto}
      onFechar={onFechar}
      entidade="ciclos"
      titulo="Novo ciclo"
      descricao="O período do PDI, com o nível atual e o nível-alvo."
      inicial={{ id: '', inicio: '', fim: '', nivelAtual: 'junior', nivelAlvo: 'pleno' }}
      corpo={(v) => v}
      aviso={(g) => `Ciclo ${(g as Ciclo).id} criado.`}
      campos={(v, alterar) => (
        <>
          <Campo rotulo="Identificador" dica='Por exemplo, "2027.1" para o primeiro semestre de 2027.'>
            <input className={CLASSE_CAMPO} required value={v.id} onChange={(e) => alterar({ id: e.target.value })} />
          </Campo>
          <Linha>
            <Campo rotulo="Início">
              <input type="date" required className={CLASSE_CAMPO} value={v.inicio} onChange={(e) => alterar({ inicio: e.target.value })} />
            </Campo>
            <Campo rotulo="Fim">
              <input type="date" required className={CLASSE_CAMPO} value={v.fim} onChange={(e) => alterar({ fim: e.target.value })} />
            </Campo>
          </Linha>
          <Linha>
            {(['nivelAtual', 'nivelAlvo'] as const).map((campo) => (
              <Campo key={campo} rotulo={campo === 'nivelAtual' ? 'Nível atual' : 'Nível-alvo'}>
                <select className={CLASSE_CAMPO} value={v[campo]} onChange={(e) => alterar({ [campo]: e.target.value as Nivel })}>
                  {NIVEIS.map((n) => (
                    <option key={n} value={n}>
                      {NOME_NIVEL[n]}
                    </option>
                  ))}
                </select>
              </Campo>
            ))}
          </Linha>
        </>
      )}
    />
  )
}
