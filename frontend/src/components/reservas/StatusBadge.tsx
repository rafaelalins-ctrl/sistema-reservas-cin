import { CheckCircleIcon, ClockIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { STATUS_RESERVA, type StatusReserva } from '@/lib/api'

// Decisão 003: estado sempre com ícone + texto. "Cancelada" é neutra (outline + XCircle, P10)
// para não parecer erro.
const APARENCIA = {
  PENDENTE: { variante: 'outline', Icone: ClockIcon },
  APROVADA: { variante: 'secondary', Icone: CheckCircleIcon },
  REJEITADA: { variante: 'destructive', Icone: WarningCircleIcon },
  CANCELADA: { variante: 'outline', Icone: XCircleIcon },
} as const

export function StatusBadge({ status }: { status: StatusReserva }) {
  const { variante, Icone } = APARENCIA[status]
  return (
    <Badge variant={variante}>
      <Icone data-icon="inline-start" /> {STATUS_RESERVA[status]}
    </Badge>
  )
}
