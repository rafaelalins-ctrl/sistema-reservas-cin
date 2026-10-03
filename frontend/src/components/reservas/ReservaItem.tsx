import { CalendarBlankIcon, UserIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/reservas/StatusBadge'
import { TIPOS_ESPACO, type Reserva } from '@/lib/api'
import { horarioFormatado, periodoFormatado } from '@/lib/reservas'

/** Cartão de reserva usado em Minhas reservas, Solicitações e Todas as reservas. */
export function ReservaItem({
  reserva,
  mostrarProfessor = false,
  acoes,
}: {
  reserva: Reserva
  mostrarProfessor?: boolean
  acoes?: ReactNode
}) {
  const { espaco } = reserva
  return (
    <li className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">
            {espaco.id ? (
              <Link to={`/app/espacos/${espaco.id}`} className="hover:underline">
                {espaco.identificacao}
              </Link>
            ) : (
              espaco.identificacao
            )}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              · {TIPOS_ESPACO[espaco.tipo]}
            </span>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarBlankIcon className="shrink-0" />
            {periodoFormatado(reserva.dataInicio, reserva.dataFim)}
          </p>
          {mostrarProfessor && reserva.professor.nome && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <UserIcon className="shrink-0" />
              {reserva.professor.nome}
            </p>
          )}
        </div>
        <StatusBadge status={reserva.status} />
      </div>
      <ul aria-label="Horários" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {reserva.horarios.map((horario, indice) => (
          <li key={indice}>{horarioFormatado(horario)}</li>
        ))}
      </ul>
      {reserva.motivo && (
        <p className="text-sm text-muted-foreground italic">Motivo: {reserva.motivo}</p>
      )}
      {acoes && (
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
          {acoes}
        </div>
      )}
    </li>
  )
}
