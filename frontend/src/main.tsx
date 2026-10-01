import { IconContext } from '@phosphor-icons/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/AuthProvider'
import { router } from '@/router'
import '@/styles/index.css'

// Identidade do CIn: ícones sempre no peso Fill, mínimo de 16px.
const iconDefaults = { weight: 'fill', size: 16 } as const

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={iconDefaults}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </IconContext.Provider>
  </StrictMode>,
)
