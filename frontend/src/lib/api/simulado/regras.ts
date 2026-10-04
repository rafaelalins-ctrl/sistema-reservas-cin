import type { Reserva } from '@/lib/api/tipos'

/** Pendentes e aprovadas ocupam o horário; rejeitadas e canceladas liberam (seção 3.2, P4). */
export function bloqueia(reserva: Reserva) {
  return reserva.status === 'PENDENTE' || reserva.status === 'APROVADA'
}
