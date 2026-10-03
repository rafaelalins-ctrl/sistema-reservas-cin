import type { CodigoErro, ErroApi } from '@/lib/api/tipos'

/** Erro de qualquer chamada da API. `status` 0 = rede ou backend fora do ar. */
export class ApiError extends Error {
  readonly status: number
  readonly codigo?: CodigoErro
  readonly campo?: string
  readonly detalhes?: ErroApi['detalhes']

  constructor(status: number, corpo: ErroApi) {
    super(corpo.mensagem)
    this.name = 'ApiError'
    this.status = status
    this.codigo = corpo.codigo
    this.campo = corpo.campo
    this.detalhes = corpo.detalhes
  }
}

const POR_CODIGO: Record<CodigoErro, string> = {
  CREDENCIAIS_INVALIDAS: 'E-mail ou senha incorretos.',
  SEM_PERMISSAO: 'Você não tem permissão para esta ação.',
  VALIDACAO: 'Confira os dados informados.',
  EMAIL_JA_CADASTRADO: 'Já existe uma conta com esse e-mail.',
  ESPACO_NAO_ENCONTRADO: 'Espaço não encontrado.',
  ESPACO_EM_MANUTENCAO: 'Este espaço está em manutenção e não aceita solicitações no momento.',
  CONFLITO_HORARIO: 'Este horário acabou de ser ocupado. Faça uma nova busca.',
  RESERVA_NAO_ENCONTRADA: 'Reserva não encontrada.',
  STATUS_INVALIDO: 'Esta reserva já mudou de situação. A lista foi atualizada.',
  IDENTIFICACAO_DUPLICADA: 'Já existe um espaço com essa identificação.',
  ESPACO_COM_RESERVAS:
    'Este espaço tem reservas vinculadas e não pode ser removido. Considere colocá-lo em manutenção.',
}

const POR_STATUS: Record<number, string> = {
  0: 'Não foi possível falar com o servidor. Verifique sua conexão ou se o backend está no ar.',
  400: 'Confira os dados informados.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'O item procurado não existe mais.',
  409: 'A operação conflita com o estado atual. Atualize a página e tente de novo.',
  502: 'O servidor está indisponível no momento. Tente novamente em instantes.',
  503: 'O servidor está indisponível no momento. Tente novamente em instantes.',
  504: 'O servidor demorou para responder. Tente novamente em instantes.',
}

type Sobrescritas = Partial<Record<CodigoErro | number, string>>

/**
 * Mensagem em pt-BR para mostrar ao usuário. Nunca devolve o texto cru do backend.
 * `sobrescritas` permite à tela trocar a mensagem de um código ou status específico.
 */
export function mensagemAmigavel(erro: unknown, sobrescritas: Sobrescritas = {}): string {
  if (!(erro instanceof ApiError)) return 'Algo deu errado. Tente novamente.'
  if (erro.codigo && sobrescritas[erro.codigo]) return sobrescritas[erro.codigo]!
  if (sobrescritas[erro.status]) return sobrescritas[erro.status]!
  // Erros de validação do simulado (e da API, quando seguir o contrato) já vêm em pt-BR.
  if (erro.codigo === 'VALIDACAO' && erro.message) return erro.message
  if (erro.codigo) return POR_CODIGO[erro.codigo]
  return POR_STATUS[erro.status] ?? 'Algo deu errado no servidor. Tente novamente.'
}

export function ehErro(erro: unknown, statusOuCodigo: number | CodigoErro) {
  return (
    erro instanceof ApiError &&
    (typeof statusOuCodigo === 'number'
      ? erro.status === statusOuCodigo
      : erro.codigo === statusOuCodigo)
  )
}
