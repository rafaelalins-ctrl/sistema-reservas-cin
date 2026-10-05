// Quem está logado, visto pela camada de API. O AuthProvider é o dono do estado na interface;
// aqui fica só o necessário para o cliente HTTP (credencial) e para o simulado (usuário atual).
import { definirCredenciais } from '@/lib/api/cliente'
import type { Credenciais, Usuario } from '@/lib/api/tipos'

let atual: Usuario | null = null

export function iniciarSessao(usuario: Usuario, credenciais: Credenciais | null) {
  atual = usuario
  definirCredenciais(credenciais)
}

/** Troca os dados do usuário logado sem mexer na credencial (ex.: depois de editar o nome). */
export function atualizarUsuarioSessao(usuario: Usuario) {
  atual = usuario
}

export function encerrarSessao() {
  atual = null
  definirCredenciais(null)
}

export function usuarioAtual() {
  return atual
}

// Um 401 em qualquer chamada autenticada encerra a sessão na interface (F04, item 3).
const ouvintes = new Set<() => void>()

export function aoExpirarSessao(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function notificarSessaoExpirada() {
  ouvintes.forEach((ouvinte) => ouvinte())
}
