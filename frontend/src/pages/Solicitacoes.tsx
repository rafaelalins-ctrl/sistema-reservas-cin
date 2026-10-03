import { CheckCircleIcon, ClockIcon, SpinnerIcon, XCircleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Alerta, Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { ReservaItem } from '@/components/reservas/ReservaItem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, mensagemAmigavel, type Reserva } from '@/lib/api'
import { useRecurso } from '@/lib/useRecurso'

export function Solicitacoes() {
  const {
    dados: reservas = [],
    setDados,
    carregando,
    erro,
    recarregar,
  } = useRecurso(() => api.reservas.pendentes(), [])
  const [processandoId, setProcessandoId] = useState<number | null>(null)
  const [erroAcao, setErroAcao] = useState('')

  async function decidir(reserva: Reserva, decisao: 'aprovar' | 'rejeitar') {
    setProcessandoId(reserva.id)
    setErroAcao('')
    try {
      await (decisao === 'aprovar'
        ? api.reservas.aprovar(reserva.id)
        : api.reservas.rejeitar(reserva.id))
      setDados(reservas.filter((item) => item.id !== reserva.id))
      toast.success(
        `Reserva de ${reserva.espaco.identificacao} ${decisao === 'aprovar' ? 'aprovada' : 'rejeitada'}.`,
      )
    } catch (e) {
      setErroAcao(mensagemAmigavel(e))
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

      {erroAcao && <Alerta>{erroAcao}</Alerta>}
      {carregando ? (
        <Carregando texto="Carregando solicitações…" />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarNovamente={recarregar} />
      ) : reservas.length === 0 ? (
        <EstadoVazio
          icone={CheckCircleIcon}
          titulo="Nenhuma solicitação pendente"
          dica="As novas reservas aparecerão aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {reservas.map((reserva) => (
            <ReservaItem
              key={reserva.id}
              reserva={reserva}
              mostrarProfessor
              acoes={
                <>
                  <Button
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
                </>
              }
            />
          ))}
        </ul>
      )}
    </section>
  )
}
