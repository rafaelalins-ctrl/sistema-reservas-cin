import { createContext, useContext } from 'react'

import type { Credenciais, UsuarioAutenticado } from '@/lib/api'

export type Sessao = {
  usuario: UsuarioAutenticado
  credenciais: Credenciais
}

export type AuthContextValue = {
  sessao: Sessao | null
  entrar: (credenciais: Credenciais, tipoEsperado: UsuarioAutenticado['tipo']) => Promise<void>
  sair: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro de AuthProvider.')
  return contexto
}
