import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/lib/auth-context'

export function RequireAuth() {
  const { sessao } = useAuth()
  const { pathname, search } = useLocation()
  // Guarda a rota pedida para o login devolver o usuário a ela (F03, item 4).
  return sessao ? <Outlet /> : <Navigate to="/login" replace state={{ de: pathname + search }} />
}
