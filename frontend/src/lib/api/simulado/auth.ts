import { ApiError } from '@/lib/api/erros'
import { atraso } from '@/lib/api/simulado/atraso'
import { banco, copia, exigirUsuario, proximoId, salvar, validacao } from '@/lib/api/simulado/banco'
import type { ApiAuth } from '@/lib/api/tipos'

// Mesmas regras do cadastro da branch (seção 3.5): trim, e-mail normalizado, senha 8–1024.
export const authSimulado: ApiAuth = {
  async cadastrar(dados) {
    await atraso()
    const nome = dados.nome.trim()
    const departamento = dados.departamento.trim()
    const email = dados.email.trim().toLowerCase()
    if (!nome) validacao('Informe seu nome.', 'nome')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) validacao('Informe um e-mail válido.', 'email')
    if (!departamento) validacao('Informe seu departamento.', 'departamento')
    if (dados.senha.length < 8 || dados.senha.length > 1024)
      validacao('A senha deve ter de 8 a 1024 caracteres.', 'senha')

    const { usuarios } = banco()
    if (usuarios.some((u) => u.email === email))
      throw new ApiError(409, {
        mensagem: 'Já existe uma conta com esse e-mail.',
        codigo: 'EMAIL_JA_CADASTRADO',
        campo: 'email',
      })
    usuarios.push({
      id: proximoId(usuarios),
      nome,
      email,
      departamento,
      tipo: 'PROFESSOR',
      senha: dados.senha,
    })
    salvar()
  },

  async entrar({ email, senha }) {
    await atraso()
    const usuario = banco().usuarios.find(
      (u) => u.email === email.trim().toLowerCase() && u.senha === senha,
    )
    if (!usuario)
      throw new ApiError(401, {
        mensagem: 'E-mail ou senha incorretos.',
        codigo: 'CREDENCIAIS_INVALIDAS',
      })
    const { senha: _senha, ...publico } = copia(usuario)
    return publico
  },

  // Mesmas regras de PUT /api/usuarios/me: o e-mail e o perfil não mudam.
  async atualizarConta(dados) {
    await atraso()
    const { id } = exigirUsuario()
    const usuario = banco().usuarios.find((u) => u.id === id)
    if (!usuario)
      throw new ApiError(404, {
        mensagem: 'Conta não encontrada.',
        codigo: 'USUARIO_NAO_ENCONTRADO',
      })
    const nome = dados.nome.trim()
    const departamento = dados.departamento?.trim() ?? ''
    if (!nome) validacao('Informe seu nome.', 'nome')
    if (usuario.tipo === 'PROFESSOR' && !departamento)
      validacao('Informe seu departamento.', 'departamento')
    if (dados.senha && (dados.senha.length < 8 || dados.senha.length > 1024))
      validacao('A senha deve ter de 8 a 1024 caracteres.', 'senha')

    usuario.nome = nome
    if (usuario.tipo === 'PROFESSOR') usuario.departamento = departamento
    if (dados.senha) usuario.senha = dados.senha
    // As reservas guardam um resumo do professor; o nome novo aparece nelas também.
    for (const reserva of banco().reservas)
      if (reserva.professor.id === id) reserva.professor.nome = nome
    salvar()
    const { senha: _senha, ...publico } = copia(usuario)
    return publico
  },

  // Mesmas regras de DELETE /api/usuarios/me: só professor, e sem reservas.
  async excluirConta() {
    await atraso()
    const { id, tipo } = exigirUsuario()
    if (tipo !== 'PROFESSOR')
      throw new ApiError(403, {
        mensagem: 'Contas de administrador não podem ser removidas.',
        codigo: 'SEM_PERMISSAO',
      })
    const estado = banco()
    if (estado.reservas.some((r) => r.professor.id === id))
      throw new ApiError(409, {
        mensagem: 'A conta possui reservas vinculadas e não pode ser removida.',
        codigo: 'USUARIO_COM_RESERVAS',
      })
    estado.usuarios = estado.usuarios.filter((u) => u.id !== id)
    salvar()
  },
}
