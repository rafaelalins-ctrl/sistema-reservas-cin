// Ponto único de acesso à API para as páginas. Cada recurso usa a implementação real ou a
// simulada conforme VITE_API_SIMULADA (docs/prd.md, seção 6.2):
//   VITE_API_SIMULADA=todos               tudo simulado (padrão em `npm run dev`)
//   VITE_API_SIMULADA=espacos,reservas    autenticação real, o resto simulado
//   VITE_API_SIMULADA=                    tudo real (padrão no build de produção)
import { ApiError } from '@/lib/api/erros'
import { authReal } from '@/lib/api/real/auth'
import { espacosReal } from '@/lib/api/real/espacos'
import { reservasReal } from '@/lib/api/real/reservas'
import { notificarSessaoExpirada } from '@/lib/api/sessao'
import type { Api } from '@/lib/api/tipos'

export * from '@/lib/api/tipos'
export * from '@/lib/api/rotulos'
export { ApiError, ehErro, mensagemAmigavel } from '@/lib/api/erros'

type Recurso = keyof Api

const configuracao: string =
  import.meta.env.VITE_API_SIMULADA ?? (import.meta.env.DEV ? 'todos' : '')
const simulados = new Set(
  configuracao
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

export function usaSimulado(recurso: Recurso) {
  return simulados.has('todos') || simulados.has(recurso)
}

export const modoSimulado = (['auth', 'espacos', 'reservas'] as Recurso[]).some(usaSimulado)

/** O campo "motivo" só aparece onde a implementação o aceita (P17; a API atual não aceita). */
export const suportaMotivo = usaSimulado('reservas')

// Carregado sob demanda: o simulado não pesa no bundle de quem usa só a API real.
const carregarSimulado = () => import('@/lib/api/simulado').then((m) => m.apiSimulada)

export async function resetarSimulado() {
  ;(await import('@/lib/api/simulado')).resetarSimulado()
}

const reais: Api = { auth: authReal, espacos: espacosReal, reservas: reservasReal }

/** Mesmas operações do recurso, delegando ao real ou ao simulado e tratando o 401 global. */
function montar<R extends Recurso>(recurso: R): Api[R] {
  const real = reais[recurso] as Record<string, (...args: unknown[]) => Promise<unknown>>
  const montado: Record<string, unknown> = {}
  for (const operacao of Object.keys(real)) {
    montado[operacao] = async (...args: unknown[]) => {
      const impl = usaSimulado(recurso)
        ? ((await carregarSimulado())[recurso] as typeof real)
        : real
      try {
        return await impl[operacao](...args)
      } catch (erro) {
        // Credencial errada no login é esperada; em qualquer outra chamada, a sessão expirou.
        const ehLogin = recurso === 'auth'
        if (!ehLogin && erro instanceof ApiError && erro.status === 401) notificarSessaoExpirada()
        throw erro
      }
    }
  }
  return montado as Api[R]
}

export const api: Api = {
  auth: montar('auth'),
  espacos: montar('espacos'),
  reservas: montar('reservas'),
}
