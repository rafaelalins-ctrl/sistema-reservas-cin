import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { api, type Reserva } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { dataFormatada, horaFormatada } from '@/lib/reservas'

function statusReserva(status: Reserva['status']) {
  switch (status) {
    case 'APROVADA':
      return { texto: 'Aprovada', Icon: CheckCircleIcon, variante: 'secondary' as const }
    case 'REJEITADA':
      return { texto: 'Rejeitada', Icon: WarningCircleIcon, variante: 'destructive' as const }
    case 'CANCELADA':
      return { texto: 'Cancelada', Icon: WarningCircleIcon, variante: 'outline' as const }
    default:
      return { texto: 'Pendente', Icon: ClockIcon, variante: 'outline' as const }
  }
}

export function MinhasReservas() {
  const { sessao } = useAuth()
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    if (!sessao) return
    api
      .minhasReservas(sessao.credenciais)
      .then((resultado) => {
        if (ativo) setReservas(resultado)
      })
      .catch((error: unknown) => {
        if (ativo)
          setErro(error instanceof Error ? error.message : 'Não foi possível carregar as reservas.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [sessao])

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

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 shrink-0" /> {erro}
        </p>
      )}
      {carregando ? (
        <p className="flex items-center gap-2 border-y border-border py-8 text-sm text-muted-foreground">
          <SpinnerIcon className="animate-spin" /> Carregando reservas…
        </p>
      ) : erro ? null : reservas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-y border-border py-10 text-center">
          <CalendarBlankIcon size={24} className="text-muted-foreground" />
          <p className="font-bold">Nenhuma reserva por enquanto</p>
          <p className="text-sm text-muted-foreground">As solicitações enviadas aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reservas.map((reserva) => {
            const status = statusReserva(reserva.status)
            return (
              <li
                key={reserva.id}
                className="flex flex-col gap-3 rounded-md border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{reserva.espaco}</h3>
                    <p className="text-sm text-muted-foreground">
                      {dataFormatada(reserva.dataInicio)}
                      {reserva.dataFim !== reserva.dataInicio &&
                        ` a ${dataFormatada(reserva.dataFim)}`}
                    </p>
                  </div>
                  <Badge variant={status.variante}>
                    <status.Icon data-icon="inline-start" /> {status.texto}
                  </Badge>
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {reserva.horarios.map((horario, indice) => (
                    <li key={`${reserva.id}-${indice}`}>
                      {horario.dia.toLowerCase()} · {horaFormatada(horario.inicioMin)}–
                      {horaFormatada(horario.fimMin)}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
