import { basicAuth, request } from '@/lib/api/cliente'
import type { ApiAuth, Usuario } from '@/lib/api/tipos'

// Formato atual da branch: `{ nome, email, tipo }`, sem id nem departamento.
// O contrato (seção 5.2) prevê `{ usuario: Usuario, token?, expiraEm? }`. Aceita os dois.
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
}
