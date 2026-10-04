import { WrenchIcon } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'

/** Estado neutro: outline + Wrench (F17). */
export function ManutencaoBadge() {
  return (
    <Badge variant="outline">
      <WrenchIcon data-icon="inline-start" /> Em manutenção
    </Badge>
  )
}
