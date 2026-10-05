import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'

import { api, usaSimulado, type AtualizacaoConta, type Credenciais, type Usuario } from '@/lib/api'
import {
  aoExpirarSessao,
  atualizarUsuarioSessao,
  encerrarSessao,
  iniciarSessao,
} from '@/lib/api/sessao'
import { AuthContext, type Sessao } from '@/lib/auth-context'

// P3: com a API real (HTTP Basic), a senha fica só em memória e o login se perde ao recarregar.
// No simulado não há senha a proteger, então guardamos o usuário no sessionStorage para o
// desenvolvimento não exigir login a cada recarga.
const CHAVE = 'cin-reservas:sessao-simulada'
const persistir = usaSimulado('auth')

function sessaoSalva(): Sessao | null {
  if (!persistir) return null
  try {
    const salvo = sessionStorage.getItem(CHAVE)
    if (!salvo) return null
    const sessao = JSON.parse(salvo) as Sessao
    iniciarSessao(sessao.usuario, null)
    return sessao
  } catch {
    return null
  }
}

function salvarSessao(sessao: Sessao | null) {
  if (!persistir) return
  try {
    if (sessao) sessionStorage.setItem(CHAVE, JSON.stringify(sessao))
    else sessionStorage.removeItem(CHAVE)
  } catch {
    // Sem armazenamento: a sessão vale só até recarregar.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [sessao, setSessao] = useState<Sessao | null>(sessaoSalva)
  const [expirou, setExpirou] = useState(false)

  const entrar = useCallback(async (credenciais: Credenciais): Promise<Usuario> => {
    const usuario = await api.auth.entrar(credenciais)
    iniciarSessao(usuario, credenciais)
    const nova = { usuario }
    salvarSessao(nova)
    setSessao(nova)
    setExpirou(false)
    return usuario
  }, [])

  const sair = useCallback(() => {
    encerrarSessao()
    salvarSessao(null)
    setSessao(null)
  }, [])

  const atualizarConta = useCallback(async (dados: AtualizacaoConta): Promise<Usuario> => {
    const usuario = await api.auth.atualizarConta(dados)
    // Com HTTP Basic a senha vai em toda chamada: sem trocar a credencial, a próxima daria 401.
    if (dados.senha) iniciarSessao(usuario, { email: usuario.email, senha: dados.senha })
    else atualizarUsuarioSessao(usuario)
    const nova = { usuario }
    salvarSessao(nova)
    setSessao(nova)
    return usuario
  }, [])

  const excluirConta = useCallback(async () => {
    await api.auth.excluirConta()
    sair()
  }, [sair])

  useEffect(
    () =>
      aoExpirarSessao(() => {
        sair()
        setExpirou(true)
      }),
    [sair],
  )

  return (
    <AuthContext.Provider value={{ sessao, entrar, sair, expirou, atualizarConta, excluirConta }}>
      {children}
    </AuthContext.Provider>
  )
}
