import {
  BuildingsIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SpinnerIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Alerta } from '@/components/estados/Estados'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, DIAS, mensagemAmigavel, TIPOS_ESPACO, type Espaco } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { dataLocal, diaDaSemana, minutos } from '@/lib/reservas'

export function BuscarReservas() {
  const { sessao } = useAuth()
  const [disponiveis, setDisponiveis] = useState<Espaco[] | null>(null)
  const [data, setData] = useState(dataLocal)
  const [inicio, setInicio] = useState('08:00')
  const [fim, setFim] = useState('09:00')
  const [capacidade, setCapacidade] = useState('1')
  const [buscando, setBuscando] = useState(false)
  const [solicitandoId, setSolicitandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const dia = data ? diaDaSemana(data) : null
  const carregando = false
  const exibidos = disponiveis ?? []

  function invalidarBusca() {
    setDisponiveis(null)
    setErro('')
  }

  async function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data || !inicio || !fim || minutos(inicio) >= minutos(fim)) {
      setErro('O horário de início deve ser anterior ao de fim.')
      return
    }
    const capacidadeMinima = Number(capacidade)
    if (!Number.isInteger(capacidadeMinima) || capacidadeMinima < 1) {
      setErro('A capacidade mínima deve ser um número inteiro positivo.')
      return
    }

    setBuscando(true)
    setErro('')
    try {
      setDisponiveis(
        await api.espacos.disponiveis({
          data,
          inicioMin: minutos(inicio),
          fimMin: minutos(fim),
          capacidadeMin: capacidadeMinima,
        }),
      )
    } catch (error) {
      setDisponiveis([])
      setErro(mensagemAmigavel(error))
    } finally {
      setBuscando(false)
    }
  }

  async function solicitar(espaco: Espaco) {
    if (!dia) return
    setSolicitandoId(espaco.id)
    setErro('')
    try {
      await api.reservas.criar({
        idEspaco: espaco.id,
        dataInicio: data,
        dataFim: data,
        horarios: [{ dia, inicioMin: minutos(inicio), fimMin: minutos(fim) }],
      })
      toast.success(`Solicitação para ${espaco.identificacao} enviada para aprovação.`)
      setDisponiveis((atuais) => atuais?.filter((e) => e.id !== espaco.id) ?? null)
    } catch (error) {
      setErro(mensagemAmigavel(error))
    } finally {
      setSolicitandoId(null)
    }
  }

  return (
    <section aria-labelledby="buscar-reservas-titulo" className="flex flex-col gap-4">
      <div>
        <h2 id="buscar-reservas-titulo" className="text-xl">
          Buscar reservas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encontre um espaço livre para uma data e horário.
        </p>
      </div>

      <form
        onSubmit={buscar}
        className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] lg:items-end"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="data-reserva">Data</Label>
          <Input
            id="data-reserva"
            type="date"
            value={data}
            min={dataLocal()}
            required
            className="h-10"
            onChange={(event) => {
              setData(event.target.value)
              invalidarBusca()
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="hora-inicio">Início</Label>
            <Input
              id="hora-inicio"
              type="time"
              value={inicio}
              required
              className="h-10"
              onChange={(event) => {
                setInicio(event.target.value)
                invalidarBusca()
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hora-fim">Fim</Label>
            <Input
              id="hora-fim"
              type="time"
              value={fim}
              required
              className="h-10"
              onChange={(event) => {
                setFim(event.target.value)
                invalidarBusca()
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="capacidade">Capacidade mínima</Label>
          <Input
            id="capacidade"
            type="number"
            min={1}
            step={1}
            value={capacidade}
            className="h-10"
            onChange={(event) => {
              setCapacidade(event.target.value)
              invalidarBusca()
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground lg:pb-2">
          <CalendarBlankIcon size={18} /> {dia && DIAS[dia]}
        </div>
        <Button type="submit" size="lg" disabled={buscando} className="h-10 w-full lg:w-auto">
          {buscando ? <SpinnerIcon className="animate-spin" /> : <MagnifyingGlassIcon />}
          Buscar
        </Button>
      </form>

      {erro && <Alerta>{erro}</Alerta>}

      {disponiveis !== null && (
        <>
          <div className="flex items-end justify-between gap-3">
            <h3 className="font-bold">Disponíveis neste horário</h3>
            <span className="text-sm text-muted-foreground tabular-nums">
              {carregando ? 'Carregando…' : `${exibidos.length} espaços`}
            </span>
          </div>

          {carregando ? (
            <p className="flex items-center gap-2 border-y border-border py-8 text-sm text-muted-foreground">
              <SpinnerIcon className="animate-spin" /> Carregando espaços…
            </p>
          ) : erro ? null : exibidos.length ? (
            <ul className="flex flex-col gap-3">
              {exibidos.map((espaco) => (
                <li
                  key={espaco.id}
                  className="flex flex-col gap-4 rounded-md border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <BuildingsIcon size={20} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h4 className="font-bold">{espaco.identificacao}</h4>
                        <span className="text-xs text-muted-foreground">
                          {TIPOS_ESPACO[espaco.tipo]}
                        </span>
                      </div>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <UsersIcon size={16} /> Até {espaco.capacidade} pessoas
                      </span>
                    </div>
                  </div>
                  {sessao?.usuario.tipo === 'PROFESSOR' && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={solicitandoId !== null}
                      onClick={() => solicitar(espaco)}
                      className="w-full sm:w-auto"
                    >
                      {solicitandoId === espaco.id ? (
                        <SpinnerIcon className="animate-spin" />
                      ) : (
                        <CheckCircleIcon />
                      )}
                      Solicitar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 border-y border-border py-10 text-center">
              <ClockIcon size={24} className="text-muted-foreground" />
              <p className="font-bold">Nenhum espaço disponível nesse horário</p>
              <p className="text-sm text-muted-foreground">
                Altere a data ou o horário e faça uma nova busca.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
