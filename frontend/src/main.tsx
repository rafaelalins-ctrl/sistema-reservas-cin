import { IconContext } from '@phosphor-icons/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/index.css'

// Identidade do CIn: ícones sempre no peso Fill, mínimo de 16px.
const iconDefaults = { weight: 'fill', size: 16 } as const

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={iconDefaults}>
      <App />
      <Toaster />
    </IconContext.Provider>
  </StrictMode>,
)
