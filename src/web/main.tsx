import '@fontsource/geist/latin-400.css'
import '@fontsource/geist/latin-500.css'
import '@fontsource/geist/latin-600.css'
import '@fontsource/geist/latin-700.css'
import '@fontsource/geist-mono/latin-500.css'
import './styles/index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { queryClient } from './api/queries'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary area="o painel">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
