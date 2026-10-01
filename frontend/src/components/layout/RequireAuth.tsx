import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/lib/auth-context'

export function RequireAuth() {
  const { sessao } = useAuth()
  return sessao ? <Outlet /> : <Navigate to="/login" replace />
}
