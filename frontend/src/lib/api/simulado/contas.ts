// Contas de teste do simulado (não existem na API real). Separado de dados.ts para a tela de
// login poder exibi-las sem carregar a carga inicial inteira.
export const SENHA_TESTE = 'senha-teste-123'
export const EMAIL_ADMIN_TESTE = 'admin@cin.ufpe.br'

export const CONTAS_TESTE = [
  { email: 'ana.souza@cin.ufpe.br', perfil: 'Professora' },
  { email: 'bruno.lima@cin.ufpe.br', perfil: 'Professor' },
  { email: EMAIL_ADMIN_TESTE, perfil: 'Administradora' },
]
