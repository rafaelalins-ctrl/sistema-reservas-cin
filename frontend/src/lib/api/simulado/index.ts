import { authSimulado } from '@/lib/api/simulado/auth'
import { espacosSimulado } from '@/lib/api/simulado/espacos'
import { reservasSimulado } from '@/lib/api/simulado/reservas'
import type { Api } from '@/lib/api/tipos'

export { resetarSimulado } from '@/lib/api/simulado/banco'

export const apiSimulada: Api = {
  auth: authSimulado,
  espacos: espacosSimulado,
  reservas: reservasSimulado,
}
