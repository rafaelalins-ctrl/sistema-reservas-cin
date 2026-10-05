// Tipos do contrato de API (docs/prd.md, seção 5.3). Fonte única para páginas, cliente real e
// simulado. Enums em MAIUSCULO_SNAKE, como o backend; rótulos em pt-BR ficam em rotulos.ts.

export type TipoUsuario = 'PROFESSOR' | 'ADMINISTRADOR'
export type TipoEspaco = 'SALA_AULA' | 'LABORATORIO' | 'AUDITORIO'
export type Bloco = 'BLOCO_A' | 'BLOCO_B' | 'BLOCO_C' | 'BLOCO_D' | 'BLOCO_E' | 'AREA_2'
export type Mobilia = 'FIXA_ANFITEATRO' | 'CADEIRAS_MOVEIS' | 'BANCADA_LAB'
export type TipoQuadro = 'BRANCO' | 'VIDRO'
export type DiaSemana = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO'
export type StatusReserva = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA'

export type Usuario = {
  id: number
  nome: string
  email: string
  tipo: TipoUsuario
  departamento?: string
}

export type Credenciais = { email: string; senha: string }

export type CadastroProfessor = {
  nome: string
  email: string
  senha: string
  departamento: string
}

/** Edição da própria conta. Departamento só vale para professor; senha vazia mantém a atual. */
export type AtualizacaoConta = {
  nome: string
  departamento?: string
  senha?: string
}

export type EspacoBase = {
  id: number
  identificacao: string
  capacidade: number
  bloco: Bloco
  mobilia: Mobilia
  qtdTomadas: number
  acessivelCadeirante: boolean
  requerRetiradaChave: boolean
  emManutencao: boolean
}

export type SalaAula = EspacoBase & {
  tipo: 'SALA_AULA'
  tipoQuadro: TipoQuadro
  possuiProjetor: boolean
}
export type Laboratorio = EspacoBase & {
  tipo: 'LABORATORIO'
  qtdComputadores: number
  softwaresInstalados: string[]
}
export type Auditorio = EspacoBase & {
  tipo: 'AUDITORIO'
  equipamentoSom: boolean
  cabineTraducao: boolean
}

export type Espaco = SalaAula | Laboratorio | Auditorio

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type EspacoEntrada = DistributiveOmit<Espaco, 'id'>

export type FiltrosEspacos = {
  tipo?: TipoEspaco
  bloco?: Bloco
  capacidadeMin?: number
  acessivel?: boolean
}

export type FiltrosDisponibilidade = {
  data: string // AAAA-MM-DD
  inicioMin: number
  fimMin: number
  capacidadeMin?: number
  tipo?: TipoEspaco
  acessivel?: boolean
}

export type Horario = { dia: DiaSemana; inicioMin: number; fimMin: number }

export type Reserva = {
  id: number
  status: StatusReserva
  dataInicio: string // AAAA-MM-DD
  dataFim: string
  horarios: Horario[]
  espaco: { id: number; identificacao: string; tipo: TipoEspaco }
  professor: { id: number; nome: string; email: string }
  criadaEm?: string // ISO 8601
  motivo?: string | null
}

export type NovaReserva = Pick<Reserva, 'dataInicio' | 'dataFim' | 'horarios'> & {
  idEspaco: number
}

export type FiltrosReservas = {
  status?: StatusReserva
  espacoId?: number
  professorId?: number
  de?: string
  ate?: string
  pagina?: number // começa em 1
  porPagina?: number
}

export type Pagina<T> = { itens: T[]; total: number }

export type Ocupacao = {
  idReserva: number
  data: string
  inicioMin: number
  fimMin: number
  status: Extract<StatusReserva, 'PENDENTE' | 'APROVADA'>
  professor?: { id: number; nome: string } // só para administrador (P12)
}

export type Agenda = { espacoId: number; ocupacoes: Ocupacao[] }

export type Conflito = { data: string; inicioMin: number; fimMin: number }

export type CodigoErro =
  | 'CREDENCIAIS_INVALIDAS'
  | 'SEM_PERMISSAO'
  | 'VALIDACAO'
  | 'EMAIL_JA_CADASTRADO'
  | 'ESPACO_NAO_ENCONTRADO'
  | 'ESPACO_EM_MANUTENCAO'
  | 'CONFLITO_HORARIO'
  | 'RESERVA_NAO_ENCONTRADA'
  | 'STATUS_INVALIDO'
  | 'IDENTIFICACAO_DUPLICADA'
  | 'ESPACO_COM_RESERVAS'
  | 'USUARIO_NAO_ENCONTRADO'
  | 'USUARIO_COM_RESERVAS'

export type ErroApi = {
  mensagem: string
  codigo?: CodigoErro
  campo?: string
  detalhes?: { conflitos?: Conflito[] } & Record<string, unknown>
}

/** Operações que as páginas usam. Real e simulado implementam exatamente esta interface. */
export type ApiAuth = {
  cadastrar(dados: CadastroProfessor): Promise<void>
  entrar(credenciais: Credenciais): Promise<Usuario>
  atualizarConta(dados: AtualizacaoConta): Promise<Usuario>
  /** Só professores sem reservas; o administrador recebe 403. */
  excluirConta(): Promise<void>
}

export type ApiEspacos = {
  listar(filtros?: FiltrosEspacos): Promise<Espaco[]>
  obter(id: number): Promise<Espaco>
  disponiveis(filtros: FiltrosDisponibilidade): Promise<Espaco[]>
  agenda(id: number, periodo: { de: string; ate: string }): Promise<Agenda>
  criar(entrada: EspacoEntrada): Promise<Espaco>
  atualizar(id: number, entrada: EspacoEntrada): Promise<Espaco>
  alterarManutencao(id: number, emManutencao: boolean): Promise<Espaco>
  remover(id: number): Promise<void>
  /** Quantas reservas pendentes ou aprovadas ainda vão ocorrer no espaço (aviso do F17). */
  contarReservasFuturas(id: number): Promise<number>
}

export type ApiReservas = {
  criar(nova: NovaReserva): Promise<Reserva>
  minhas(): Promise<Reserva[]>
  pendentes(): Promise<Reserva[]>
  listar(filtros?: FiltrosReservas): Promise<Pagina<Reserva>>
  aprovar(id: number): Promise<void>
  rejeitar(id: number, motivo?: string): Promise<void>
  cancelar(id: number, motivo?: string): Promise<void>
}

export type Api = { auth: ApiAuth; espacos: ApiEspacos; reservas: ApiReservas }
