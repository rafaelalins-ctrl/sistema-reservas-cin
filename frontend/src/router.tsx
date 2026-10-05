import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardIndex } from '@/components/layout/DashboardIndex'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { RequireRole } from '@/components/layout/RequireRole'
import { Cadastro } from '@/pages/Cadastro'
import { Disponibilidade } from '@/pages/Disponibilidade'
import { ErroInesperado } from '@/pages/ErroInesperado'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { MinhaConta } from '@/pages/MinhaConta'
import { MinhasReservas } from '@/pages/MinhasReservas'
import { NotFound } from '@/pages/NotFound'
import { Solicitacoes } from '@/pages/Solicitacoes'

const professor = (pagina: ReactNode) => <RequireRole tipo="PROFESSOR">{pagina}</RequireRole>
const admin = (pagina: ReactNode) => <RequireRole tipo="ADMINISTRADOR">{pagina}</RequireRole>

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <ErroInesperado />,
    children: [
      {
        // Rota sem caminho: falhas dentro das telas mantêm cabeçalho e rodapé.
        errorElement: <ErroInesperado />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/login', element: <Login /> },
          { path: '/cadastro', element: <Cadastro /> },
          {
            path: '/conta',
            element: <RequireAuth />,
            children: [{ index: true, element: <MinhaConta /> }],
          },
          {
            path: '/app',
            element: <RequireAuth />,
            children: [
              {
                element: <DashboardLayout />,
                children: [
                  { index: true, element: <DashboardIndex /> },
                  { path: 'minhas-reservas', element: professor(<MinhasReservas />) },
                  { path: 'solicitacoes', element: admin(<Solicitacoes />) },
                  { path: 'disponibilidade', element: <Disponibilidade /> },
                  {
                    path: 'reservas',
                    lazy: async () => {
                      const { TodasReservas } = await import('@/pages/TodasReservas')
                      return { element: admin(<TodasReservas />) }
                    },
                  },
                  {
                    path: 'reservas/nova',
                    lazy: async () => {
                      const { NovaReserva } = await import('@/pages/NovaReserva')
                      return { element: professor(<NovaReserva />) }
                    },
                  },
                  // Rota antiga da branch, mantida para links salvos.
                  {
                    path: 'buscar-reservas',
                    element: <Navigate to="/app/disponibilidade" replace />,
                  },
                  {
                    path: 'espacos',
                    lazy: async () => ({
                      Component: (await import('@/pages/espacos/Catalogo')).Catalogo,
                    }),
                  },
                  {
                    path: 'espacos/novo',
                    lazy: async () => {
                      const { FormularioEspaco } = await import('@/pages/espacos/FormularioEspaco')
                      return { element: admin(<FormularioEspaco />) }
                    },
                  },
                  {
                    path: 'espacos/:id/editar',
                    lazy: async () => {
                      const { FormularioEspaco } = await import('@/pages/espacos/FormularioEspaco')
                      return { element: admin(<FormularioEspaco />) }
                    },
                  },
                  {
                    path: 'espacos/:id',
                    lazy: async () => ({
                      Component: (await import('@/pages/espacos/DetalheEspaco')).DetalheEspaco,
                    }),
                  },
                ],
              },
            ],
          },
          // Guia visual só em desenvolvimento: verificado pelo tsc, fora do build de produção.
          ...(import.meta.env.DEV
            ? [
                {
                  path: '/style-guide',
                  lazy: async () => ({
                    Component: (await import('../docs/StyleGuide')).StyleGuide,
                  }),
                },
              ]
            : []),
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
