import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
