import {
  BuildingsIcon,
  CalendarBlankIcon,
  MagnifyingGlassIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, type CatalogoEspaco } from '@/lib/api'
import { dataLocal } from '@/lib/reservas'

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

function formatarAndar(andar: number | null) {
  if (andar === null) return 'Não informado'
  if (andar === 0) return 'Térreo'
  return `${andar}º andar`
}

function formatarHorario(minutos: number) {
  const hora = String(Math.floor(minutos / 60)).padStart(2, '0')
  const minuto = String(minutos % 60).padStart(2, '0')
  return `${hora}:${minuto}`
}

export function CatalogoEspacos() {
  const [espacos, setEspacos] = useState<CatalogoEspaco[]>([])
  const [busca, setBusca] = useState('')
  const [blocoSelecionado, setBlocoSelecionado] = useState('')
  const [tipoSelecionado, setTipoSelecionado] = useState('')
  const [dataAgenda, setDataAgenda] = useState(dataLocal)
  const [espacoSelecionadoId, setEspacoSelecionadoId] = useState<number | null>(null)
  const [agenda, setAgenda] = useState<Awaited<ReturnType<typeof api.buscarAgendaEspaco>> | null>(
    null,
  )
  const [carregando, setCarregando] = useState(true)
  const [carregandoAgenda, setCarregandoAgenda] = useState(false)
  const [erro, setErro] = useState('')
  const [erroAgenda, setErroAgenda] = useState('')

  useEffect(() => {
    let ativo = true
    api
      .listarCatalogoEspacos()
      .then((resultado) => {
        if (ativo) setEspacos(resultado)
      })
      .catch((error: unknown) => {
        if (ativo)
          setErro(error instanceof Error ? error.message : 'Não foi possível carregar os espaços.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (espacoSelecionadoId === null) {
      return
    }

    let ativo = true
    api
      .buscarAgendaEspaco(espacoSelecionadoId, dataAgenda)
      .then((resultado) => {
        if (ativo) setAgenda(resultado)
      })
      .catch((error: unknown) => {
        if (ativo)
          setErroAgenda(
            error instanceof Error ? error.message : 'Não foi possível carregar a agenda.',
          )
      })
      .finally(() => {
        if (ativo) setCarregandoAgenda(false)
      })
    return () => {
      ativo = false
    }
  }, [dataAgenda, espacoSelecionadoId])

  const blocos = Array.from(
    new Set(espacos.flatMap((espaco) => (espaco.bloco ? [espaco.bloco] : []))),
  ).sort()
  const tipos = Array.from(new Set(espacos.map((espaco) => espaco.tipo))).sort(
    (primeiro, segundo) => primeiro.localeCompare(segundo, 'pt-BR'),
  )
  const termo = normalizarBusca(busca.trim())
  const filtrados = espacos.filter((espaco) => {
    const texto = normalizarBusca(`${espaco.nome} ${espaco.codigo ?? ''} ${espaco.tipo}`)
    return (
      (!termo || texto.includes(termo)) &&
      (!blocoSelecionado || espaco.bloco === blocoSelecionado) &&
      (!tipoSelecionado || espaco.tipo === tipoSelecionado)
    )
  })
  const espacoSelecionado = espacos.find((espaco) => espaco.id === espacoSelecionadoId)

  return (
    <section aria-labelledby="catalogo-espacos-titulo" className="flex flex-col gap-5">
      <header className="border-b border-border pb-4">
        <h2 id="catalogo-espacos-titulo" className="text-xl">
          Catálogo de espaços
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Salas, laboratórios, auditórios e demais espaços identificados no CIn.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_16rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="catalogo-busca">Buscar por nome ou código</Label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="catalogo-busca"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Ex.: B002/B004"
              className="h-10 pl-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="catalogo-bloco">Bloco</Label>
          <select
            id="catalogo-bloco"
            value={blocoSelecionado}
            onChange={(event) => setBlocoSelecionado(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Todos</option>
            {blocos.map((bloco) => (
              <option key={bloco} value={bloco}>
                Bloco {bloco}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="catalogo-tipo">Tipo</Label>
          <select
            id="catalogo-tipo"
            value={tipoSelecionado}
            onChange={(event) => setTipoSelecionado(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Todos</option>
            {tipos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="catalogo-data-agenda">Data da agenda</Label>
        <Input
          id="catalogo-data-agenda"
          type="date"
          min={dataLocal()}
          value={dataAgenda}
          onChange={(event) => {
            setCarregandoAgenda(true)
            setErroAgenda('')
            setDataAgenda(event.target.value)
          }}
          className="h-10"
        />
      </div>

      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 border-y border-destructive/30 py-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 shrink-0" /> {erro}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
        <h3 className="font-bold">Espaços cadastrados</h3>
        <span className="text-muted-foreground tabular-nums">
          {carregando ? 'Carregando…' : `${filtrados.length} de ${espacos.length}`}
        </span>
      </div>

      {carregando ? (
        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <SpinnerIcon className="animate-spin" /> Carregando espaços…
        </p>
      ) : erro ? null : filtrados.length ? (
        <ul className="divide-y divide-border">
          {filtrados.map((espaco) => (
            <li
              key={espaco.id}
              className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h4 className="font-bold">{espaco.nome}</h4>
                  {espaco.codigo ? (
                    <span className="font-mono text-xs text-muted-foreground">{espaco.codigo}</span>
                  ) : null}
                </div>
                {espaco.observacao ? (
                  <p className="mt-1 text-sm text-muted-foreground">{espaco.observacao}</p>
                ) : null}
              </div>
              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <dt className="sr-only">Tipo</dt>
                  <dd>{espaco.tipo}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="sr-only">Bloco</dt>
                  <dd>{espaco.bloco ? `Bloco ${espaco.bloco}` : 'Bloco não informado'}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="sr-only">Andar</dt>
                  <dd>{formatarAndar(espaco.andar)}</dd>
                </div>
              </dl>
              <Button
                type="button"
                variant={espacoSelecionadoId === espaco.id ? 'secondary' : 'outline'}
                aria-pressed={espacoSelecionadoId === espaco.id}
                onClick={() => {
                  if (espacoSelecionadoId === espaco.id) return
                  setCarregandoAgenda(true)
                  setErroAgenda('')
                  setEspacoSelecionadoId(espaco.id)
                }}
                className="w-full sm:w-auto"
              >
                <CalendarBlankIcon />
                Ver agenda
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 border-y border-border py-10 text-center">
          <BuildingsIcon size={24} className="text-muted-foreground" />
          <p className="font-bold">Nenhum espaço encontrado</p>
          <p className="text-sm text-muted-foreground">Altere a busca ou os filtros.</p>
        </div>
      )}

      {espacoSelecionado ? (
        <section aria-labelledby="agenda-espaco-titulo" className="border-t border-border pt-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h3 id="agenda-espaco-titulo" className="font-bold">
                Agenda: {espacoSelecionado.nome}
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(`${dataAgenda}T12:00:00`).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {espacoSelecionado.codigo ? (
              <span className="font-mono text-xs text-muted-foreground">
                {espacoSelecionado.codigo}
              </span>
            ) : null}
          </div>

          {erroAgenda ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 border-y border-destructive/30 py-3 text-sm text-destructive"
            >
              <WarningCircleIcon className="mt-0.5 shrink-0" /> {erroAgenda}
            </p>
          ) : carregandoAgenda ? (
            <p className="mt-4 flex items-center gap-2 border-y border-border py-6 text-sm text-muted-foreground">
              <SpinnerIcon className="animate-spin" /> Carregando agenda…
            </p>
          ) : agenda?.horarios.length ? (
            <ul className="mt-3 divide-y divide-border">
              {agenda.horarios.map((horario) => (
                <li
                  key={`${horario.idReserva}-${horario.inicioMin}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <span className="font-mono tabular-nums">
                    {formatarHorario(horario.inicioMin)}–{formatarHorario(horario.fimMin)}
                  </span>
                  <span className="text-muted-foreground">
                    {horario.status === 'APROVADA' ? 'Aprovada' : 'Pendente'}
                    {horario.dataInicio !== horario.dataFim
                      ? ` · ${new Date(`${horario.dataInicio}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${horario.dataFim}T12:00:00`).toLocaleDateString('pt-BR')}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-y border-border py-6 text-sm text-muted-foreground">
              Nenhuma reserva pendente ou aprovada para este espaço nesta data.
            </p>
          )}
        </section>
      ) : null}
    </section>
  )
}
