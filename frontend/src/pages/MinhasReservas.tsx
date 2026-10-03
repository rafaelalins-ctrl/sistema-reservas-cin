import { CalendarBlankIcon, MagnifyingGlassIcon, XCircleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Confirmacao, Resumo } from '@/components/Confirmacao'
import { Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { Campo } from '@/components/formulario/Campo'
import { SelectSimples, TODOS } from '@/components/formulario/SelectSimples'
import { ReservaItem } from '@/components/reservas/ReservaItem'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  api,
  ehErro,
  mensagemAmigavel,
  opcoes,
  STATUS_RESERVA,
  suportaMotivo,
  TIPOS_ESPACO,
  type Reserva,
  type StatusReserva,
} from '@/lib/api'
import { dataLocal, horarioFormatado, periodoFormatado, podeCancelar } from '@/lib/reservas'
import { useFiltrosUrl } from '@/lib/useFiltrosUrl'
import { useRecurso } from '@/lib/useRecurso'

const STATUS_PLURAL: Record<StatusReserva, string> = {
  PENDENTE: 'Pendentes',
  APROVADA: 'Aprovadas',
  REJEITADA: 'Rejeitadas',
  CANCELADA: 'Canceladas',
}

export function MinhasReservas() {
  const {
    dados: reservas = [],
    setDados,
    carregando,
    erro,
    recarregar,
  } = useRecurso(() => api.reservas.minhas(), [])
  const { filtros, definir } = useFiltrosUrl(['status', 'quando'] as const)
  const status = (filtros.status || TODOS) as StatusReserva | typeof TODOS
  const quando = filtros.quando === 'passadas' ? 'passadas' : 'proximas'

  // `cancelando` continua preenchido enquanto o diálogo anima ao fechar.
  const [cancelando, setCancelando] = useState<Reserva | null>(null)
  const [dialogoAberto, setDialogoAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erroCancelar, setErroCancelar] = useState('')

  const hoje = dataLocal()
  const doPeriodo = reservas.filter((r) =>
    quando === 'proximas' ? r.dataFim >= hoje : r.dataFim < hoje,
  )
  const exibidas = doPeriodo
    .filter((r) => status === TODOS || r.status === status)
    // Próximas: da mais próxima para a mais distante. Passadas: da mais recente para a mais antiga.
    .sort((a, b) =>
      quando === 'proximas'
        ? a.dataInicio.localeCompare(b.dataInicio)
        : b.dataFim.localeCompare(a.dataFim),
    )

  function abrirCancelamento(reserva: Reserva) {
    setCancelando(reserva)
    setDialogoAberto(true)
    setMotivo('')
    setErroCancelar('')
  }

  async function confirmarCancelamento() {
    if (!cancelando) return
    setProcessando(true)
    setErroCancelar('')
    try {
      await api.reservas.cancelar(cancelando.id, suportaMotivo ? motivo : undefined)
      setDados(
        reservas.map((r) =>
          r.id === cancelando.id
            ? {
                ...r,
                status: 'CANCELADA',
                motivo: suportaMotivo ? motivo.trim() || null : r.motivo,
              }
            : r,
        ),
      )
      toast.success(`Reserva de ${cancelando.espaco.identificacao} cancelada.`)
      setDialogoAberto(false)
    } catch (e) {
      if (ehErro(e, 409)) {
        toast.error('Esta reserva não pode mais ser cancelada.')
        setDialogoAberto(false)
        void recarregar()
      } else setErroCancelar(mensagemAmigavel(e))
    } finally {
      setProcessando(false)
    }
  }

  return (
    <section aria-labelledby="minhas-reservas-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="minhas-reservas-titulo" className="text-xl">
            Minhas reservas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Solicitações e seus status</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/app/disponibilidade">
            <MagnifyingGlassIcon data-icon="inline-start" />
            Encontrar um espaço
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={quando} onValueChange={(v) => definir({ quando: v === 'passadas' ? v : '' })}>
          <TabsList className="h-10">
            <TabsTrigger value="proximas" className="px-3">
              Próximas
            </TabsTrigger>
            <TabsTrigger value="passadas" className="px-3">
              Passadas
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Campo id="filtro-status" rotulo="Status" className="sm:w-56">
          {(props) => (
            <SelectSimples
              {...props}
              valor={status}
              aoMudar={(v) => definir({ status: v === TODOS ? '' : v })}
              rotuloTodos="Todas"
              opcoes={opcoes(STATUS_PLURAL)}
            />
          )}
        </Campo>
      </div>

      {carregando ? (
        <Carregando texto="Carregando reservas…" />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarNovamente={recarregar} />
      ) : exibidas.length === 0 ? (
        <EstadoVazio
          icone={CalendarBlankIcon}
          titulo={
            reservas.length === 0
              ? 'Nenhuma reserva por enquanto'
              : `Nenhuma reserva ${quando === 'proximas' ? 'próxima' : 'passada'}${
                  status === TODOS ? '' : ` com status ${STATUS_RESERVA[status].toLowerCase()}`
                }`
          }
          dica={
            reservas.length === 0
              ? 'Encontre um espaço livre e envie sua primeira solicitação.'
              : 'Mude os filtros para ver outras reservas.'
          }
          acao={
            reservas.length === 0 && (
              <Button asChild variant="outline">
                <Link to="/app/disponibilidade">Encontrar um espaço</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {exibidas.length} de {doPeriodo.length}{' '}
            {quando === 'proximas' ? 'reservas próximas' : 'reservas passadas'}
          </p>
          <ul className="flex flex-col gap-3">
            {exibidas.map((reserva) => (
              <ReservaItem
                key={reserva.id}
                reserva={reserva}
                acoes={
                  podeCancelar(reserva, hoje) && (
                    <Button variant="outline" onClick={() => abrirCancelamento(reserva)}>
                      <XCircleIcon data-icon="inline-start" />
                      Cancelar reserva
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        </>
      )}

      <Confirmacao
        aberto={dialogoAberto}
        aoMudarAberto={setDialogoAberto}
        titulo="Cancelar esta reserva?"
        descricao="Esta ação não pode ser desfeita. O horário fica livre para outras solicitações."
        rotuloConfirmar="Cancelar reserva"
        icone={XCircleIcon}
        variante="destructive"
        processando={processando}
        erro={erroCancelar}
        aoConfirmar={confirmarCancelamento}
      >
        {cancelando && (
          <>
            <Resumo
              itens={[
                [
                  'Espaço',
                  `${cancelando.espaco.identificacao} · ${TIPOS_ESPACO[cancelando.espaco.tipo]}`,
                ],
                ['Período', periodoFormatado(cancelando.dataInicio, cancelando.dataFim)],
                [
                  'Horários',
                  <ul key="h">
                    {cancelando.horarios.map((h, i) => (
                      <li key={i}>{horarioFormatado(h)}</li>
                    ))}
                  </ul>,
                ],
              ]}
            />
            {suportaMotivo && (
              <Campo id="cancelar-motivo" rotulo="Motivo (opcional)">
                {(props) => (
                  <Textarea
                    {...props}
                    maxLength={300}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                )}
              </Campo>
            )}
          </>
        )}
      </Confirmacao>
    </section>
  )
}
