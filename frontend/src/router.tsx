import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardIndex } from '@/components/layout/DashboardIndex'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { RequireRole } from '@/components/layout/RequireRole'
import { BuscarReservas } from '@/pages/BuscarReservas'
import { Cadastro } from '@/pages/Cadastro'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { MinhasReservas } from '@/pages/MinhasReservas'
import { NotFound } from '@/pages/NotFound'
import { Solicitacoes } from '@/pages/Solicitacoes'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/cadastro', element: <Cadastro /> },
      {
        path: '/app',
        element: <RequireAuth />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { index: true, element: <DashboardIndex /> },
              {
                path: 'minhas-reservas',
                element: (
                  <RequireRole tipo="PROFESSOR">
                    <MinhasReservas />
                  </RequireRole>
                ),
              },
              {
                path: 'solicitacoes',
                element: (
                  <RequireRole tipo="ADMINISTRADOR">
                    <Solicitacoes />
                  </RequireRole>
                ),
              },
              { path: 'buscar-reservas', element: <BuscarReservas /> },
              { path: 'espacos', element: <BuscarReservas /> },
            ],
          },
        ],
      },
      // Guia visual só em desenvolvimento: verificado pelo tsc, fora do build de produção.
      ...(import.meta.env.DEV
        ? [
            {
              path: '/style-guide',
              lazy: async () => ({ Component: (await import('@/pages/StyleGuide')).StyleGuide }),
            },
          ]
        : []),
      { path: '*', element: <NotFound /> },
    ],
  },
])
