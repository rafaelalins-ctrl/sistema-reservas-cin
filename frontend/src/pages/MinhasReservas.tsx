import { CalendarBlankIcon } from '@phosphor-icons/react'

import { Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { ReservaItem } from '@/components/reservas/ReservaItem'
import { api } from '@/lib/api'
import { useRecurso } from '@/lib/useRecurso'

export function MinhasReservas() {
  const {
    dados: reservas = [],
    carregando,
    erro,
    recarregar,
  } = useRecurso(() => api.reservas.minhas(), [])

  return (
    <section aria-labelledby="minhas-reservas-titulo" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="minhas-reservas-titulo" className="text-xl">
            Minhas reservas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Solicitações e seus status</p>
        </div>
        {!carregando && (
          <span className="text-sm text-muted-foreground tabular-nums">{reservas.length}</span>
        )}
      </div>

      {carregando ? (
        <Carregando texto="Carregando reservas…" />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarNovamente={recarregar} />
      ) : reservas.length === 0 ? (
        <EstadoVazio
          icone={CalendarBlankIcon}
          titulo="Nenhuma reserva por enquanto"
          dica="As solicitações enviadas aparecerão aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {reservas.map((reserva) => (
            <ReservaItem key={reserva.id} reserva={reserva} />
          ))}
        </ul>
      )}
    </section>
  )
}
