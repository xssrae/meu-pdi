import { Target, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '../components/cn'

export interface ItemNav {
  rotulo: string
  icone: LucideIcon
  /** Rota interna (NavLink) ou link externo (`obsidian://`). */
  to?: string
  href?: string
  /** Contador de alerta (ex.: metas atrasadas) ou informação curta (ex.: data da 1:1). */
  contador?: { valor: string; rotulo: string; tom: 'alerta' | 'info' }
}

export interface GrupoNav {
  titulo: string
  itens: ItemNav[]
}

interface Props {
  ciclo: string | null
  grupos: GrupoNav[]
  rodape?: ItemNav[]
  perfil?: { iniciais: string; nome: string; cargo: string }
}

const ITEM = 'flex min-h-10 pointer-coarse:min-h-11 items-center gap-2.5 rounded-md px-3 type-body no-underline'
const INATIVO = 'font-medium text-ink-2 hover:bg-muted hover:text-ink'
const ATIVO = 'bg-card font-semibold text-ink shadow-tab'

/** Valor curto visível; o leitor de tela ouve o rótulo completo (`aria-label` não vale em `span`). */
function Contador({ c }: { c: NonNullable<ItemNav['contador']> }) {
  return (
    <span className={c.tom === 'alerta' ? 'rounded-xs bg-alert px-1.5 py-px type-micro font-semibold text-on-ink' : 'type-micro font-mono text-ink-2'}>
      <span aria-hidden="true">{c.valor}</span>
      <span className="sr-only">, {c.rotulo}</span>
    </span>
  )
}

function Item({ item }: { item: ItemNav }) {
  const Icone = item.icone
  const corpo = (
    <>
      <Icone aria-hidden="true" className="size-4.5 shrink-0" strokeWidth={1.75} />
      <span className="flex-1">{item.rotulo}</span>
      {item.contador && <Contador c={item.contador} />}
    </>
  )
  if (item.to) {
    return (
      <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => cn(ITEM, isActive ? ATIVO : INATIVO)}>
        {corpo}
      </NavLink>
    )
  }
  return (
    <a href={item.href} className={cn(ITEM, INATIVO)}>
      {corpo}
    </a>
  )
}

/** Barra lateral do painel. Só recebe itens que têm fluxo (itens sem tela ficam fora). */
export function Sidebar({ ciclo, grupos, rodape = [], perfil }: Props) {
  return (
    <div className="flex h-full flex-col gap-5 bg-shell px-4 py-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-on-ink">
          <Target aria-hidden="true" className="size-5.5" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="type-title font-bold">Meu PDI</span>
            {ciclo && <span className="rounded-xs bg-ink px-1.5 py-0.5 type-micro font-semibold text-on-ink">{ciclo}</span>}
          </span>
          <span className="type-caption text-ink-3">Plano de Desenvolvimento Individual</span>
        </span>
      </div>

      {grupos.map((g) => (
        <nav key={g.titulo} aria-label={g.titulo} className="flex flex-col gap-0.5">
          <span className="px-3 pb-1.5 type-caption font-medium text-ink-3">{g.titulo}</span>
          {g.itens.map((i) => (
            <Item key={i.rotulo} item={i} />
          ))}
        </nav>
      ))}

      <div className="min-h-4 flex-1" />

      {rodape.length > 0 && (
        <div className="flex flex-col gap-0.5 border-b border-line-subtle pb-4">
          {rodape.map((i) => (
            <Item key={i.rotulo} item={i} />
          ))}
        </div>
      )}

      {perfil && (
        <div className="flex items-center gap-2.5 rounded-xl border border-line-subtle bg-card p-2.5">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-soft type-body font-semibold">
            {perfil.iniciais}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="type-body font-semibold">{perfil.nome}</span>
            <span className="type-caption text-ink-3">{perfil.cargo}</span>
          </span>
        </div>
      )}
    </div>
  )
}

