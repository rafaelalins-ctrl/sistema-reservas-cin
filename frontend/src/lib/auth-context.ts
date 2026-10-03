import { createContext, useContext } from 'react'

import type { Credenciais, Usuario } from '@/lib/api'

export type Sessao = { usuario: Usuario }

export type AuthContextValue = {
  sessao: Sessao | null
  /** Autentica e devolve o usuário; o perfil vem da API, o login não pergunta. */
  entrar: (credenciais: Credenciais) => Promise<Usuario>
  sair: () => void
  /** true quando a sessão terminou por um 401 (e não por "Sair"). Zera ao entrar de novo. */
  expirou: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro de AuthProvider.')
  return contexto
}

/** Para telas dentro de /app, onde RequireAuth já garante a sessão. */
export function useUsuario() {
  const { sessao } = useAuth()
  if (!sessao) throw new Error('useUsuario precisa estar dentro de uma rota protegida.')
  return sessao.usuario
}
