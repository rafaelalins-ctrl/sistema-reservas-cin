import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import type { TipoUsuario } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function RequireRole({ tipo, children }: { tipo: TipoUsuario; children: ReactNode }) {
  const { sessao } = useAuth()
  return sessao?.usuario.tipo === tipo ? children : <Navigate to="/app" replace />
}
