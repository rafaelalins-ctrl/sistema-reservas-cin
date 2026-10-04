import { Navigate } from 'react-router-dom'

import { useAuth } from '@/lib/auth-context'

export function DashboardIndex() {
  const { sessao } = useAuth()
  return (
    <Navigate
      to={sessao?.usuario.tipo === 'ADMINISTRADOR' ? 'solicitacoes' : 'minhas-reservas'}
      replace
    />
  )
}
