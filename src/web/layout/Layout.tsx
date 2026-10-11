import { CalendarCheck, ChartNoAxesColumn, Folder, LayoutDashboard, MessageSquare, Route, Users } from 'lucide-react'
import { Outlet } from 'react-router'
import { useResumo } from '../api/queries'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { diaMes } from '../format'
import { AppShell } from './AppShell'
import { Sidebar, type GrupoNav } from './Sidebar'

// Só entram na navegação as telas que já têm fluxo (CodingPreferences).
// Evidências, busca e Configurações ficam fora até terem tela.
function grupos(metasAtrasadas: number, proximaReuniao: string | null): GrupoNav[] {
  return [
    {
      titulo: 'Painel',
      itens: [
        { rotulo: 'Visão geral', icone: LayoutDashboard, to: '/' },
        { rotulo: 'Competências', icone: ChartNoAxesColumn, to: '/competencias' },
        { rotulo: 'Trilhas de carreira', icone: Route, to: '/trilhas' },
        {
          rotulo: 'Planejamentos',
          icone: CalendarCheck,
          to: '/planejamentos',
          contador: metasAtrasadas
            ? { valor: String(metasAtrasadas), rotulo: metasAtrasadas === 1 ? '1 meta atrasada' : `${metasAtrasadas} metas atrasadas`, tom: 'alerta' }
            : undefined,
        },
        { rotulo: 'Projetos', icone: Folder, to: '/projetos' },
      ],
    },
    {
      titulo: 'Ferramentas',
      itens: [
        { rotulo: 'Feedbacks', icone: MessageSquare, to: '/feedbacks' },
        {
          rotulo: 'Reuniões 1:1',
          icone: Users,
          to: '/reunioes',
          contador: proximaReuniao ? { valor: diaMes(proximaReuniao), rotulo: `próxima em ${diaMes(proximaReuniao)}`, tom: 'info' } : undefined,
        },
      ],
    },
  ]
}

export function Layout() {
  const { data } = useResumo()
  const barra = data?.barraLateral
  return (
    <AppShell sidebar={<Sidebar ciclo={data?.ciclo?.id ?? null} grupos={grupos(barra?.metasAtrasadas ?? 0, barra?.proximaReuniao ?? null)} />}>
      <ErrorBoundary area="esta tela">
        <Outlet />
      </ErrorBoundary>
    </AppShell>
  )
}
