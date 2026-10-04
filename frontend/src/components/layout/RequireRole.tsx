import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import type { UsuarioAutenticado } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function RequireRole({
  tipo,
  children,
}: {
  tipo: UsuarioAutenticado['tipo']
  children: ReactNode
}) {
  const { sessao } = useAuth()
  return sessao?.usuario.tipo === tipo ? children : <Navigate to="/app" replace />
}
