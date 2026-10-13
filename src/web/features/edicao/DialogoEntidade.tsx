// Diálogo de criar/editar uma entidade do PDI. Cada formulário só declara
// os campos e o corpo enviado; aqui ficam o envio, o erro do servidor, o
// toast e a exclusão com confirmação (definitiva: o backup diário é a rede).

import { Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { Entidade, TipoDe } from '../../../server/servicos'
import { useEscrita } from '../../api/mutacoes'
import { Button } from '../../components/Button'
import { CorpoDialogo, Dialogo, RodapeDialogo } from '../../components/Dialogo'
import { useToast } from '../../components/toast-context'

export interface Existente {
  chave: string
  versao: number
  /** "a ação PDI-03", usado na confirmação e no toast. */
  nome: string
}

interface Props<V> {
  aberto: boolean
  onFechar: () => void
  entidade: Entidade
  titulo: string
  descricao?: string
  /** Presente ao editar: mostra "Excluir" e envia PATCH com If-Match. */
  existente?: Existente
  inicial: V
  campos: (v: V, alterar: (p: Partial<V>) => void) => ReactNode
  corpo: (v: V) => object
  /** Texto do toast de sucesso, a partir do registro gravado. */
  aviso: (gravado: TipoDe[Entidade]) => string
  /** Explica o que a exclusão leva junto. */
  efeitoExclusao?: string
  /** `false` esconde "Excluir" ao editar parte de uma entidade (autoavaliação de um ciclo). */
  permitirExclusao?: boolean
}

export function DialogoEntidade<V>(props: Props<V>) {
  return (
    <Dialogo aberto={props.aberto} onAbertoChange={(a) => !a && props.onFechar()} titulo={props.titulo} descricao={props.descricao}>
      {/* Montado só aberto: cada abertura começa do estado `inicial`. */}
      {props.aberto && <Conteudo {...props} />}
    </Dialogo>
  )
}

function Conteudo<V>({ onFechar, entidade, existente, inicial, campos, corpo, aviso, efeitoExclusao, permitirExclusao = true }: Props<V>) {
  const [v, setV] = useState(inicial)
  const [confirmando, setConfirmando] = useState(false)
  const escrita = useEscrita()
  const avisar = useToast()
  const alterar = (p: Partial<V>) => setV((atual) => ({ ...atual, ...p }))

  function salvar(e: FormEvent) {
    e.preventDefault()
    escrita.mutate(
      existente
        ? { op: 'atualizar', entidade, chave: existente.chave, versao: existente.versao, patch: corpo(v) }
        : { op: 'criar', entidade, dados: corpo(v) },
      {
        onSuccess: (gravado) => {
          avisar(aviso(gravado!))
          onFechar()
        },
      },
    )
  }

  function excluir() {
    if (!existente) return
    escrita.mutate(
      { op: 'excluir', entidade, chave: existente.chave, versao: existente.versao },
      {
        onSuccess: () => {
          avisar(`Você excluiu ${existente.nome}.`)
          onFechar()
        },
        onError: () => setConfirmando(false),
      },
    )
  }

  const erro = escrita.error && (
    <p role="alert" className="m-0 rounded-md border border-meta-atrasada-bg bg-card px-3 py-2 type-small text-meta-atrasada-fg">
      {escrita.error.message}
    </p>
  )

  if (confirmando && existente) {
    return (
      <>
        <CorpoDialogo>
          <p className="m-0 type-body">
            Excluir {existente.nome}? Não dá para desfazer pelo painel{efeitoExclusao ? `: ${efeitoExclusao}` : '.'}
          </p>
          <p className="m-0 type-small text-ink-3">O backup do dia, em data/backups, guarda o estado anterior à primeira gravação de hoje.</p>
          {erro}
        </CorpoDialogo>
        <RodapeDialogo>
          <Button onClick={() => setConfirmando(false)} disabled={escrita.isPending}>
            Cancelar
          </Button>
          <Button variante="perigo" onClick={excluir} disabled={escrita.isPending}>
            {escrita.isPending ? 'Excluindo…' : 'Excluir definitivamente'}
          </Button>
        </RodapeDialogo>
      </>
    )
  }

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-col">
      <CorpoDialogo>
        {campos(v, alterar)}
        {erro}
      </CorpoDialogo>
      <RodapeDialogo>
        {existente && permitirExclusao && (
          <Button
            className="mr-auto text-meta-atrasada-fg"
            icone={<Trash2 aria-hidden="true" className="size-4" />}
            onClick={() => {
              escrita.reset()
              setConfirmando(true)
            }}
            disabled={escrita.isPending}
          >
            Excluir
          </Button>
        )}
        <Button onClick={onFechar} disabled={escrita.isPending}>
          Cancelar
        </Button>
        <Button type="submit" variante="primario" disabled={escrita.isPending}>
          {escrita.isPending ? 'Salvando…' : existente ? 'Salvar' : 'Criar'}
        </Button>
      </RodapeDialogo>
    </form>
  )
}
