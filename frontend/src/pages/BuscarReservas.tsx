import {
  BuildingsIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SpinnerIcon,
  UsersIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, type Espaco } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { dataLocal, DIAS, minutos, nomeTipo } from '@/lib/reservas'

function mensagemErro(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}

export function BuscarReservas() {
  const { sessao } = useAuth()
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [idsDisponiveis, setIdsDisponiveis] = useState<number[] | null>(null)
  const [data, setData] = useState(dataLocal)
  const [inicio, setInicio] = useState('08:00')
  const [fim, setFim] = useState('09:00')
  const [capacidade, setCapacidade] = useState('1')
  const [carregando, setCarregando] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [solicitandoId, setSolicitandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    api
      .listarEspacos()
      .then((resultado) => {
        if (ativo) setEspacos(resultado)
      })
      .catch((error: unknown) => {
        if (ativo) setErro(mensagemErro(error))
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  const dia = DIAS[new Date(`${data}T12:00:00`).getDay()]
  const exibidos = idsDisponiveis
    ? espacos.filter((espaco) => idsDisponiveis.includes(espaco.id))
    : espacos.filter((espaco) => !espaco.emManutencao)

  function invalidarBusca() {
    setIdsDisponiveis(null)
    setErro('')
  }

  async function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data || !inicio || !fim || minutos(inicio) >= minutos(fim)) {
      setErro('Informe uma data e um intervalo de horário válido.')
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
      const filtros = new URLSearchParams({
        dia: dia.api,
        inicio: String(minutos(inicio)),
        fim: String(minutos(fim)),
        data,
        capacidade: String(capacidadeMinima),
      })
      const resultado = await api.buscarDisponibilidade(filtros)
      setIdsDisponiveis(resultado.map((espaco) => espaco.id))
    } catch (error) {
      setIdsDisponiveis([])
      setErro(mensagemErro(error))
    } finally {
      setBuscando(false)
    }
  }

  async function solicitar(espaco: Espaco) {
    if (!sessao || !dia) return
    setSolicitandoId(espaco.id)
    setErro('')
    try {
      const reserva = await api.solicitarReserva(
        {
          idEspaco: espaco.id,
          dataInicio: data,
          dataFim: data,
          horarios: [{ dia: dia.api, inicioMin: minutos(inicio), fimMin: minutos(fim) }],
        },
        sessao.credenciais,
      )
      toast.success(`Solicitação ${reserva.id} enviada para aprovação.`)
      setIdsDisponiveis((ids) => ids?.filter((id) => id !== espaco.id) ?? null)
    } catch (error) {
      setErro(mensagemErro(error))
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
          <CalendarBlankIcon size={18} /> {dia?.nome}
        </div>
        <Button type="submit" size="lg" disabled={buscando} className="h-10 w-full lg:w-auto">
          {buscando ? <SpinnerIcon className="animate-spin" /> : <MagnifyingGlassIcon />}
          Buscar
        </Button>
      </form>

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 shrink-0" /> {erro}
        </p>
      )}

      {idsDisponiveis !== null && (
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
                        <span className="text-xs text-muted-foreground">{nomeTipo(espaco.tipo)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{espaco.descricao}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <UsersIcon size={16} /> Até {espaco.capacidade} pessoas
                      </span>
                    </div>
                  </div>
                  {sessao?.usuario.tipo === 'PROFESSOR' && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !!espaco.emManutencao ||
                        !idsDisponiveis.includes(espaco.id) ||
                        solicitandoId !== null
                      }
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
