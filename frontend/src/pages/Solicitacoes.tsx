import {
  CheckCircleIcon,
  ClockIcon,
  SpinnerIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, type Reserva } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { dataFormatada, horaFormatada } from '@/lib/reservas'

export function Solicitacoes() {
  const { sessao } = useAuth()
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    if (!sessao) return
    api
      .reservasPendentes(sessao.credenciais)
      .then((resultado) => {
        if (ativo) setReservas(resultado)
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErro(
            error instanceof Error ? error.message : 'Não foi possível carregar solicitações.',
          )
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [sessao])

  async function decidir(reserva: Reserva, decisao: 'aprovar' | 'rejeitar') {
    if (!sessao) return
    setProcessandoId(reserva.id)
    setErro('')
    try {
      if (decisao === 'aprovar') {
        await api.aprovarReserva(reserva.id, sessao.credenciais)
      } else {
        await api.rejeitarReserva(reserva.id, sessao.credenciais)
      }
      setReservas((atuais) => atuais.filter((item) => item.id !== reserva.id))
      toast.success(`Reserva ${reserva.id} ${decisao === 'aprovar' ? 'aprovada' : 'rejeitada'}.`)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível atualizar a solicitação.')
    } finally {
      setProcessandoId(null)
    }
  }

  return (
    <section aria-labelledby="solicitacoes-titulo" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="solicitacoes-titulo" className="text-xl">
            Solicitações pendentes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Reservas aguardando decisão</p>
        </div>
        {!carregando && (
          <Badge variant="outline">
            <ClockIcon data-icon="inline-start" /> {reservas.length}
          </Badge>
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
          <SpinnerIcon className="animate-spin" /> Carregando solicitações…
        </p>
      ) : erro ? null : reservas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-y border-border py-10 text-center">
          <CheckCircleIcon size={24} className="text-muted-foreground" />
          <p className="font-bold">Nenhuma solicitação pendente</p>
          <p className="text-sm text-muted-foreground">As novas reservas aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reservas.map((reserva) => (
            <li
              key={reserva.id}
              className="flex flex-col gap-4 rounded-md border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{reserva.espaco}</h3>
                  <p className="text-sm text-muted-foreground">
                    {reserva.professor && `${reserva.professor} · `}
                    {dataFormatada(reserva.dataInicio)}
                    {reserva.dataFim !== reserva.dataInicio &&
                      ` a ${dataFormatada(reserva.dataFim)}`}
                  </p>
                </div>
                <Badge variant="outline">
                  <ClockIcon data-icon="inline-start" /> Pendente
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
              <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={processandoId !== null}
                  onClick={() => decidir(reserva, 'rejeitar')}
                >
                  {processandoId === reserva.id ? (
                    <SpinnerIcon className="animate-spin" />
                  ) : (
                    <XCircleIcon />
                  )}
                  Rejeitar
                </Button>
                <Button
                  type="button"
                  disabled={processandoId !== null}
                  onClick={() => decidir(reserva, 'aprovar')}
                >
                  {processandoId === reserva.id ? (
                    <SpinnerIcon className="animate-spin" />
                  ) : (
                    <CheckCircleIcon />
                  )}
                  Aprovar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
