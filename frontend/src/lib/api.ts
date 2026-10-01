export type Espaco = {
  id: number
  identificacao: string
  capacidade: number
  tipo: string
  descricao: string
  emManutencao: boolean
}

export type CatalogoEspaco = {
  id: number
  codigo: string | null
  nome: string
  tipo: string
  bloco: string | null
  andar: number | null
  observacao: string | null
}

export type HorarioAgenda = {
  idReserva: number
  dataInicio: string
  dataFim: string
  status: 'PENDENTE' | 'APROVADA'
  dia: string
  inicioMin: number
  fimMin: number
}

export type AgendaEspaco = {
  data: string
  horarios: HorarioAgenda[]
}

export type HorarioReserva = {
  dia: string
  inicioMin: number
  fimMin: number
}

export type NovaReserva = {
  idEspaco: number
  dataInicio: string
  dataFim: string
  horarios: HorarioReserva[]
}

export type Credenciais = {
  email: string
  senha: string
}

export type UsuarioAutenticado = {
  nome: string
  email: string
  tipo: 'PROFESSOR' | 'ADMINISTRADOR'
}

export type CadastroProfessor = {
  nome: string
  email: string
  senha: string
  departamento: string
}

export type Reserva = {
  id: number
  dataInicio: string
  dataFim: string
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA'
  espaco: string
  tipoEspaco: string
  professor?: string
  horarios: HorarioReserva[]
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

function basicAuthHeader({ email, senha }: Credenciais) {
  const bytes = new TextEncoder().encode(`${email}:${senha}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.text()
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new ApiError(
        'Backend indisponível. Inicie o servidor C++ em 127.0.0.1:18080 e tente novamente.',
        response.status,
      )
    }
    let message = body || `Falha na requisição (${response.status}).`
    try {
      const payload = JSON.parse(body) as { mensagem?: string }
      message = payload.mensagem || message
    } catch {
      // O backend também retorna mensagens de erro como texto simples.
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  cadastrarProfessor: (dados: CadastroProfessor) =>
    request<{ mensagem: string; tipo: 'PROFESSOR' }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  login: (credenciais: Credenciais) =>
    request<UsuarioAutenticado>('/auth/login', {
      method: 'POST',
      headers: { Authorization: basicAuthHeader(credenciais) },
    }),

  minhasReservas: (credenciais: Credenciais) =>
    request<Reserva[]>('/reservas/minhas', {
      headers: { Authorization: basicAuthHeader(credenciais) },
    }),

  reservasPendentes: (credenciais: Credenciais) =>
    request<Reserva[]>('/reservas/pendentes', {
      headers: { Authorization: basicAuthHeader(credenciais) },
    }),

  aprovarReserva: (id: number, credenciais: Credenciais) =>
    request<void>(`/reservas/${id}/aprovar`, {
      method: 'POST',
      headers: { Authorization: basicAuthHeader(credenciais) },
    }),

  rejeitarReserva: (id: number, credenciais: Credenciais) =>
    request<void>(`/reservas/${id}/rejeitar`, {
      method: 'POST',
      headers: { Authorization: basicAuthHeader(credenciais) },
    }),

  listarEspacos: () => request<Espaco[]>('/espacos'),

  listarCatalogoEspacos: () => request<CatalogoEspaco[]>('/catalogo/espacos'),

  buscarAgendaEspaco: (id: number, data: string) =>
    request<AgendaEspaco>(`/catalogo/espacos/${id}/agenda?data=${encodeURIComponent(data)}`),

  buscarDisponibilidade: (filtros: URLSearchParams) =>
    request<Array<Pick<Espaco, 'id' | 'identificacao' | 'capacidade'>>>(
      `/espacos/disponiveis?${filtros.toString()}`,
    ),

  solicitarReserva: (reserva: NovaReserva, credenciais: Credenciais) =>
    request<{ id: number; status: string }>('/reservas', {
      method: 'POST',
      headers: { Authorization: basicAuthHeader(credenciais) },
      body: JSON.stringify(reserva),
    }),
}
