import { basicAuth, request } from '@/lib/api/cliente'
import type { ApiAuth, Usuario } from '@/lib/api/tipos'

// Aceita respostas simples do backend atual e o envelope de compatibilidade legado.
type RespostaLogin = Partial<Usuario> & { usuario?: Usuario }

function adaptarUsuario(resposta: RespostaLogin): Usuario {
  const u = resposta.usuario ?? resposta
  return {
    id: u.id ?? 0,
    nome: u.nome ?? '',
    email: u.email ?? '',
    tipo: u.tipo ?? 'PROFESSOR',
    departamento: u.departamento,
  }
}

export const authReal: ApiAuth = {
  async cadastrar(dados) {
    await request('/auth/register', { method: 'POST', corpo: dados })
  },

  async entrar(credenciais) {
    const resposta = await request<RespostaLogin>('/auth/login', {
      method: 'POST',
      headers: { Authorization: basicAuth(credenciais) },
    })
    return adaptarUsuario(resposta)
  },

  async atualizarConta(dados) {
    const resposta = await request<RespostaLogin>('/usuarios/me', { method: 'PUT', corpo: dados })
    return adaptarUsuario(resposta)
  },

  async excluirConta() {
    await request('/usuarios/me', { method: 'DELETE' })
  },
}
