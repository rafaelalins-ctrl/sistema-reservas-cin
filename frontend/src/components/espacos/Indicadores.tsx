import { KeyIcon, MapPinIcon, UsersIcon, WheelchairIcon } from '@phosphor-icons/react'

import { ManutencaoBadge } from '@/components/espacos/ManutencaoBadge'
import { BLOCOS, type Espaco } from '@/lib/api'

/** Linha de atributos-resumo de um espaço, sempre ícone + texto. */
export function Indicadores({ espaco }: { espaco: Espaco }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <UsersIcon /> Até {espaco.capacidade} pessoas
      </li>
      <li className="flex items-center gap-1.5">
        <MapPinIcon /> {BLOCOS[espaco.bloco]}
      </li>
      {espaco.acessivelCadeirante && (
        <li className="flex items-center gap-1.5">
          <WheelchairIcon /> Acessível
        </li>
      )}
      {espaco.requerRetiradaChave && (
        <li className="flex items-center gap-1.5">
          <KeyIcon /> Retirada de chave
        </li>
      )}
      {espaco.emManutencao && (
        <li>
          <ManutencaoBadge />
        </li>
      )}
    </ul>
  )
}
