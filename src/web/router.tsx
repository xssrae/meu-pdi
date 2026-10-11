import { createBrowserRouter, type RouteObject } from 'react-router'
import { Competencias } from './features/competencias/Competencias'
import { Feedbacks } from './features/feedbacks/Feedbacks'
import { Planejamentos } from './features/planejamentos/Planejamentos'
import { Projetos } from './features/projetos/Projetos'
import { Reunioes } from './features/reunioes/Reunioes'
import { Trilhas } from './features/trilhas/Trilhas'
import { VisaoGeral } from './features/visao-geral/VisaoGeral'
import { Layout } from './layout/Layout'

// Filtros e seleção ficam na URL (Architecture §6): a visão sobrevive ao reload.
const rotas: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <VisaoGeral /> },
      { path: 'competencias', element: <Competencias /> },
      { path: 'trilhas', element: <Trilhas /> },
      { path: 'trilhas/:id', element: <Trilhas /> },
      { path: 'planejamentos', element: <Planejamentos /> },
      { path: 'reunioes', element: <Reunioes /> },
      { path: 'feedbacks', element: <Feedbacks /> },
      { path: 'projetos', element: <Projetos /> },
    ],
  },
]

// Catálogo do design system: só em desenvolvimento, fora do build de produção.
if (import.meta.env.DEV) {
  rotas.push({
    path: '/_fundamentos',
    lazy: async () => ({ Component: (await import('./dev/Fundamentos')).Fundamentos }),
  })
}

export const router = createBrowserRouter(rotas)
