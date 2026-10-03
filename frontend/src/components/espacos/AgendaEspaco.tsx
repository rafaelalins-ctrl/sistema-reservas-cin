import { CaretLeftIcon, CaretRightIcon, UserIcon } from '@phosphor-icons/react'
import { useState } from 'react'

import { Carregando, EstadoErro } from '@/components/estados/Estados'
import { Campo } from '@/components/formulario/Campo'
import { StatusBadge } from '@/components/reservas/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, DIAS } from '@/lib/api'
import {
  dataCurta,
  dataLocal,
  datasDoPeriodo,
  diaDaSemana,
  faixaFormatada,
  paraData,
  somarDias,
} from '@/lib/reservas'
import { useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/utils'

/** "segunda-feira" → "Segunda-feira" (a classe `capitalize` faria "Segunda-Feira"). */
const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

/** Segunda-feira da semana da data. */
function segundaDaSemana(data: string) {
  const dia = paraData(data).getDay() // 0 = domingo
  return somarDias(data, dia === 0 ? -6 : 1 - dia)
}

/**
 * Ocupação semanal de um espaço: faixas pendentes e aprovadas (F13). O administrador vê quem
 * reservou; o professor não (P12, decidido no backend).
 */
export function AgendaEspaco({
  espacoId,
  dataInicial,
}: {
  espacoId: number
  dataInicial?: string
}) {
  const [data, setData] = useState(dataInicial ?? dataLocal())
  const de = segundaDaSemana(data)
  const ate = somarDias(de, 6)
  const { dados, carregando, erro, recarregar } = useRecurso(
    () => api.espacos.agenda(espacoId, { de, ate }),
    [espacoId, de, ate],
  )
  const hoje = dataLocal()
  const ocupacoes = dados?.ocupacoes ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Campo id={`agenda-${espacoId}-data`} rotulo="Data">
          {(props) => (
            <Input
              {...props}
              type="date"
              value={data}
              onChange={(e) => e.target.value && setData(e.target.value)}
              className="h-10 w-44"
            />
          )}
        </Campo>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10" onClick={() => setData(somarDias(de, -7))}>
            <CaretLeftIcon data-icon="inline-start" />
            Semana anterior
          </Button>
          <Button variant="outline" className="h-10" onClick={() => setData(somarDias(de, 7))}>
            Próxima semana
            <CaretRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Semana de {dataCurta(de)} a {dataCurta(ate)}
        {!carregando && !erro && ocupacoes.length === 0 && (
          <> · Nenhuma reserva pendente ou aprovada para este espaço nesta semana.</>
        )}
      </p>

      {carregando ? (
        <Carregando texto="Carregando agenda…" />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarNovamente={recarregar} />
      ) : (
        <ol className="flex flex-col divide-y divide-border rounded-md border border-border bg-background">
          {datasDoPeriodo(de, ate).map((dia) => {
            const doDia = ocupacoes.filter((o) => o.data === dia)
            return (
              <li
                key={dia}
                aria-current={dia === data ? 'date' : undefined}
                className={cn(
                  'grid gap-2 p-3 sm:grid-cols-[12rem_1fr]',
                  dia === data && 'bg-muted/60',
                  dia < hoje && 'text-muted-foreground',
                )}
              >
                <p className="text-sm">
                  <span className="font-bold">{maiuscula(DIAS[diaDaSemana(dia)])}</span>,{' '}
                  {dataCurta(dia)}
                  {dia === hoje && <span className="text-muted-foreground"> · hoje</span>}
                </p>
                {doDia.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Livre</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {doDia.map((o) => (
                      <li
                        key={`${o.idReserva}-${o.inicioMin}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                      >
                        <span className="font-bold tabular-nums">{faixaFormatada(o)}</span>
                        <StatusBadge status={o.status} />
                        {o.professor && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <UserIcon /> {o.professor.nome}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
