// Estado em memória do simulado. Em desenvolvimento, persiste no sessionStorage para sobreviver
// ao recarregar a página; resetarSimulado() volta à carga inicial.
import { ApiError } from '@/lib/api/erros'
import { usuarioAtual } from '@/lib/api/sessao'
import type { Espaco, Reserva, TipoUsuario, Usuario } from '@/lib/api/tipos'
import { semente, type UsuarioSimulado } from '@/lib/api/simulado/dados'

type Estado = {
  usuarios: UsuarioSimulado[]
  espacos: Espaco[]
  reservas: Reserva[]
}

const CHAVE = 'cin-reservas:simulado:v1'
let estado: Estado | null = null

function armazenamento(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

export function banco(): Estado {
  if (estado) return estado
  try {
    const salvo = armazenamento()?.getItem(CHAVE)
    if (salvo) estado = JSON.parse(salvo) as Estado
  } catch {
    estado = null
  }
  estado ??= semente()
  return estado
}

export function salvar() {
  try {
    armazenamento()?.setItem(CHAVE, JSON.stringify(banco()))
  } catch {
    // Sem armazenamento (janela anônima, testes): segue só em memória.
  }
}

export function resetarSimulado() {
  estado = semente()
  salvar()
}

export function proximoId(lista: { id: number }[]) {
  return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1
}

export function copia<T>(valor: T): T {
  return structuredClone(valor)
}

/** Exige sessão (401) e, se informado, o perfil (403). Devolve o usuário logado. */
export function exigirUsuario(tipo?: TipoUsuario): Usuario {
  const usuario = usuarioAtual()
  if (!usuario) throw new ApiError(401, { mensagem: 'Autenticação necessária.' })
  if (tipo && usuario.tipo !== tipo)
    throw new ApiError(403, { mensagem: 'Sem permissão.', codigo: 'SEM_PERMISSAO' })
  return usuario
}

export function validacao(mensagem: string, campo?: string): never {
  throw new ApiError(400, { mensagem, codigo: 'VALIDACAO', campo })
}
