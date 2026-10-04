import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Alerta, Carregando, ErroCampo, EstadoErro } from '@/components/estados/Estados'
import { Campo, Sobrelinha } from '@/components/formulario/Campo'
import { SelectSimples } from '@/components/formulario/SelectSimples'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  api,
  ApiError,
  DIAS,
  DIAS_CURTOS,
  DIAS_UTEIS_PRIMEIRO,
  mensagemAmigavel,
  TIPOS_ESPACO,
  type Conflito,
  type DiaSemana,
  type Horario,
} from '@/lib/api'
import {
  dataCurta,
  dataLocal,
  diaDaSemana,
  faixaFormatada,
  horaFormatada,
  minutos,
  ocorrencias,
  temErros,
  validarReserva,
} from '@/lib/reservas'
import { useRecurso } from '@/lib/useRecurso'

/** Linha do formulário: horas como texto "HH:MM" enquanto o usuário edita. */
type LinhaHorario = { chave: number; dia: DiaSemana; inicio: string; fim: string }

let proximaChave = 1
const novaLinha = (dia: DiaSemana, inicio = '08:00', fim = '10:00'): LinhaHorario => ({
  chave: proximaChave++,
  dia,
  inicio,
  fim,
})

const OPCOES_DIA = DIAS_UTEIS_PRIMEIRO.map((dia) => ({ valor: dia, rotulo: DIAS[dia] }))

export function NovaReserva() {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const hoje = dataLocal()

  // Pré-preenchido pela busca de disponibilidade (?espaco=&data=&inicio=&fim=) ou pelo detalhe.
  const dataInicial = params.get('data') && params.get('data')! >= hoje ? params.get('data')! : hoje
  const [idEspaco, setIdEspaco] = useState(params.get('espaco') ?? '')
  const [dataInicio, setDataInicio] = useState(dataInicial)
  const [dataFim, setDataFim] = useState(dataInicial)
  const [linhas, setLinhas] = useState<LinhaHorario[]>(() => [
    novaLinha(
      diaDaSemana(dataInicial),
      params.get('inicio') ?? '08:00',
      params.get('fim') ?? '10:00',
    ),
  ])
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const [erroEspaco, setErroEspaco] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [conflitos, setConflitos] = useState<Conflito[]>([])

  const {
    dados: espacos = [],
    carregando,
    erro,
    recarregar,
  } = useRecurso(() => api.espacos.listar(), [])
  // Espaços em manutenção não aceitam solicitações (seção 3.4).
  const reservaveis = espacos.filter((e) => !e.emManutencao)
  const espaco = espacos.find((e) => String(e.id) === idEspaco)

  const horarios: Horario[] = linhas.map((l) => ({
    dia: l.dia,
    inicioMin: minutos(l.inicio),
    fimMin: minutos(l.fim),
  }))
  const erros = useMemo(
    () => validarReserva({ dataInicio, dataFim, horarios }, hoje),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataInicio, dataFim, linhas, hoje],
  )
  const lista = temErros(erros) ? [] : ocorrencias(dataInicio, dataFim, horarios)
  const mostrar = (mensagem?: string) => (tentouEnviar ? mensagem : undefined)

  function alterarLinha(chave: number, alteracao: Partial<LinhaHorario>) {
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...alteracao } : l)))
    setConflitos([])
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTentouEnviar(true)
    setErroEnvio('')
    setConflitos([])
    const semEspaco = !espaco ? 'Escolha um espaço.' : ''
    setErroEspaco(semEspaco)
    if (semEspaco || temErros(erros)) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setEnviando(true)
    try {
      await api.reservas.criar({ idEspaco: espaco!.id, dataInicio, dataFim, horarios })
      toast.success('Solicitação enviada para aprovação', {
        description: `${espaco!.identificacao} · ${lista.length} ${lista.length === 1 ? 'ocorrência' : 'ocorrências'}`,
      })
      navegar('/app/minhas-reservas')
    } catch (e) {
      if (e instanceof ApiError && e.codigo === 'CONFLITO_HORARIO') {
        setConflitos(e.detalhes?.conflitos ?? [])
        setErroEnvio(
          'Pelo menos uma ocorrência conflita com outra reserva pendente ou aprovada. Ajuste os horários ou o período.',
        )
      } else setErroEnvio(mensagemAmigavel(e))
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <Carregando texto="Carregando espaços…" />
  if (erro) return <EstadoErro erro={erro} aoTentarNovamente={recarregar} />

  return (
    <section aria-labelledby="nova-reserva-titulo" className="flex max-w-3xl flex-col gap-5">
      <button
        type="button"
        onClick={() => navegar(-1)}
        className="flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon /> Voltar
      </button>
      <div>
        <Sobrelinha>Nova solicitação</Sobrelinha>
        <h2 id="nova-reserva-titulo" className="mt-1 text-xl">
          Reserva com período e horários semanais
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Para uma aula avulsa, use o mesmo dia no início e no fim. Para o semestre, escolha o
          período e os dias da semana.
        </p>
      </div>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <fieldset className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-3">
          <legend className="px-1 text-sm font-bold">Espaço e período</legend>
          <Campo id="reserva-espaco" rotulo="Espaço" erro={erroEspaco} className="sm:col-span-3">
            {(props) => (
              <SelectSimples
                {...props}
                valor={idEspaco}
                aoMudar={(v) => {
                  setIdEspaco(v)
                  setErroEspaco('')
                  setConflitos([])
                }}
                placeholder="Escolha um espaço"
                opcoes={reservaveis.map((e) => ({
                  valor: String(e.id),
                  rotulo: `${e.identificacao} · ${TIPOS_ESPACO[e.tipo]} · até ${e.capacidade} pessoas`,
                }))}
              />
            )}
          </Campo>
          <Campo id="reserva-inicio" rotulo="Data de início" erro={mostrar(erros.dataInicio)}>
            {(props) => (
              <Input
                {...props}
                type="date"
                min={hoje}
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value)
                  if (dataFim < e.target.value) setDataFim(e.target.value)
                  setConflitos([])
                }}
                className="h-10"
              />
            )}
          </Campo>
          <Campo id="reserva-fim" rotulo="Data de fim" erro={mostrar(erros.dataFim)}>
            {(props) => (
              <Input
                {...props}
                type="date"
                min={dataInicio || hoje}
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value)
                  setConflitos([])
                }}
                className="h-10"
              />
            )}
          </Campo>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
          <legend className="px-1 text-sm font-bold">Horários semanais</legend>
          <ul className="flex flex-col gap-3">
            {linhas.map((linha, i) => {
              const erroLinha = mostrar(erros.porHorario[i])
              const idErro = `horario-${linha.chave}-erro`
              const invalido = erroLinha ? true : undefined
              return (
                <li
                  key={linha.chave}
                  className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                    <Campo
                      id={`horario-${linha.chave}-dia`}
                      rotulo="Dia"
                      className="col-span-2 sm:col-span-1"
                    >
                      {(props) => (
                        <SelectSimples<DiaSemana>
                          {...props}
                          aria-invalid={invalido}
                          aria-describedby={erroLinha ? idErro : undefined}
                          valor={linha.dia}
                          aoMudar={(v) => alterarLinha(linha.chave, { dia: v as DiaSemana })}
                          opcoes={OPCOES_DIA}
                        />
                      )}
                    </Campo>
                    {(['inicio', 'fim'] as const).map((campo) => (
                      <Campo
                        key={campo}
                        id={`horario-${linha.chave}-${campo}`}
                        rotulo={campo === 'inicio' ? 'Início' : 'Fim'}
                      >
                        {(props) => (
                          <Input
                            {...props}
                            aria-invalid={invalido}
                            aria-describedby={erroLinha ? idErro : undefined}
                            type="time"
                            step={300}
                            value={linha[campo]}
                            onChange={(e) => alterarLinha(linha.chave, { [campo]: e.target.value })}
                            className="h-10"
                          />
                        )}
                      </Campo>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      className="col-span-2 h-10 sm:col-span-1"
                      disabled={linhas.length === 1}
                      onClick={() =>
                        setLinhas((atuais) => atuais.filter((l) => l.chave !== linha.chave))
                      }
                    >
                      <TrashIcon data-icon="inline-start" />
                      Remover
                      <span className="sr-only">
                        {' '}
                        horário de {DIAS[linha.dia]} {linha.inicio}–{linha.fim}
                      </span>
                    </Button>
                  </div>
                  <ErroCampo id={idErro}>{erroLinha}</ErroCampo>
                </li>
              )
            })}
          </ul>
          <ErroCampo id="horarios-erro">{mostrar(erros.horarios)}</ErroCampo>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => {
              const ultima = linhas.at(-1)
              setLinhas((atuais) => [
                ...atuais,
                novaLinha(ultima?.dia ?? 'SEGUNDA', ultima?.inicio, ultima?.fim),
              ])
            }}
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar horário
          </Button>
        </fieldset>

        <ResumoOcorrencias
          quantidade={lista.length}
          dataInicio={dataInicio}
          dataFim={dataFim}
          ocorrenciasLista={lista}
        />

        {erroEnvio && (
          <Alerta>
            <span>{erroEnvio}</span>
            {conflitos.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {conflitos.slice(0, 8).map((c) => (
                  <li key={`${c.data}-${c.inicioMin}`}>
                    {DIAS_CURTOS[diaDaSemana(c.data)]} {dataCurta(c.data)}, {faixaFormatada(c)}
                  </li>
                ))}
                {conflitos.length > 8 && <li>e mais {conflitos.length - 8}</li>}
              </ul>
            )}
          </Alerta>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="ghost" className="h-10">
            <Link to="/app/minhas-reservas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={enviando} className="h-10 px-4">
            <PaperPlaneTiltIcon data-icon="inline-start" />
            {enviando ? 'Enviando…' : 'Enviar solicitação'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function ResumoOcorrencias({
  quantidade,
  dataInicio,
  dataFim,
  ocorrenciasLista,
}: {
  quantidade: number
  dataInicio: string
  dataFim: string
  ocorrenciasLista: Conflito[]
}) {
  if (quantidade === 0) return null
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-2 rounded-md border border-border bg-muted/50 p-4 text-sm"
    >
      <p className="flex items-center gap-2 font-bold">
        <CalendarCheckIcon />
        {quantidade === 1 ? '1 ocorrência' : `${quantidade} ocorrências`} entre{' '}
        {dataCurta(dataInicio)} e {dataCurta(dataFim)}
      </p>
      <details>
        <summary className="cursor-pointer text-muted-foreground">Ver datas</summary>
        <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-3">
          {ocorrenciasLista.map((o) => (
            <li key={`${o.data}-${o.inicioMin}`} className="tabular-nums">
              {DIAS_CURTOS[diaDaSemana(o.data)]} {dataCurta(o.data)} · {horaFormatada(o.inicioMin)}–
              {horaFormatada(o.fimMin)}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
