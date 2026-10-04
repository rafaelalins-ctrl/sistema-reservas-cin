import { useState, type PropsWithChildren } from 'react'

import { api, type Credenciais, type UsuarioAutenticado } from '@/lib/api'
import { AuthContext, type Sessao } from '@/lib/auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [sessao, setSessao] = useState<Sessao | null>(null)

  async function entrar(credenciais: Credenciais, tipoEsperado: UsuarioAutenticado['tipo']) {
    const usuario = await api.login(credenciais)
    if (usuario.tipo !== tipoEsperado) {
      throw new Error(
        usuario.tipo === 'ADMINISTRADOR'
          ? 'Esta conta é de administrador. Selecione esse perfil para entrar.'
          : 'Esta conta é de professor. Selecione esse perfil para entrar.',
      )
    }
    setSessao({ usuario, credenciais })
  }

  function sair() {
    setSessao(null)
  }

  return <AuthContext.Provider value={{ sessao, entrar, sair }}>{children}</AuthContext.Provider>
}
