import { request } from '@/lib/api/cliente'
import type { ApiReservas, Pagina, Reserva, TipoEspaco } from '@/lib/api/tipos'

// A branch devolve `espaco` e `professor` como texto, sem id, e o tipo em `tipoEspaco`.
// O adaptador converte para o tipo do contrato; quando a API mudar, ele vira identidade.
type ReservaBruta = Omit<Reserva, 'espaco' | 'professor'> & {
  espaco: Reserva['espaco'] | string
  professor?: Reserva['professor'] | string
  tipoEspaco?: TipoEspaco
  idEspaco?: number
}

export function adaptarReserva(bruta: ReservaBruta): Reserva {
  const espaco =
    typeof bruta.espaco === 'string'
      ? {
          id: bruta.idEspaco ?? 0,
          identificacao: bruta.espaco,
          tipo: bruta.tipoEspaco ?? 'SALA_AULA',
        }
      : bruta.espaco
  const professor =
    typeof bruta.professor === 'string' || bruta.professor === undefined
      ? { id: 0, nome: bruta.professor ?? '', email: '' }
      : bruta.professor
  return {
    id: bruta.id,
    status: bruta.status,
    dataInicio: bruta.dataInicio,
    dataFim: bruta.dataFim,
    horarios: bruta.horarios,
    espaco,
    professor,
    criadaEm: bruta.criadaEm,
    motivo: bruta.motivo ?? null,
  }
}

export const reservasReal: ApiReservas = {
  async criar(nova) {
    // A branch responde `201 { id, status }`; o contrato prevê a `Reserva` completa.
    const resposta = await request<Partial<ReservaBruta> & { id: number }>('/reservas', {
      method: 'POST',
      corpo: nova,
    })
    return adaptarReserva({
      status: 'PENDENTE',
      dataInicio: nova.dataInicio,
      dataFim: nova.dataFim,
      horarios: nova.horarios,
      espaco: { id: nova.idEspaco, identificacao: '', tipo: 'SALA_AULA' },
      ...resposta,
    } as ReservaBruta)
  },

  async minhas() {
    return (await request<ReservaBruta[]>('/reservas/minhas')).map(adaptarReserva)
  },

  async pendentes() {
    return (await request<ReservaBruta[]>('/reservas/pendentes')).map(adaptarReserva)
  },

  async listar(filtros = {}) {
    const pagina = await request<Pagina<ReservaBruta>>('/reservas', { query: filtros })
    return { itens: pagina.itens.map(adaptarReserva), total: pagina.total }
  },

  async aprovar(id) {
    await request(`/reservas/${id}/aprovar`, { method: 'POST' })
  },

  async rejeitar(id, motivo) {
    await request(`/reservas/${id}/rejeitar`, {
      method: 'POST',
      corpo: motivo ? { motivo } : undefined,
    })
  },

  async cancelar(id, motivo) {
    await request(`/reservas/${id}/cancelar`, {
      method: 'POST',
      corpo: motivo ? { motivo } : undefined,
    })
  },
}
