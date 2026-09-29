import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      {
        // Carregado sob demanda: o guia importa todos os componentes e não deve pesar nas outras telas.
        path: '/style-guide',
        lazy: async () => ({ Component: (await import('@/pages/StyleGuide')).StyleGuide }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
