import {
  CalendarBlankIcon,
  CalendarPlusIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  RepeatIcon,
} from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Confirmacao, Resumo } from '@/components/Confirmacao'
import { Indicadores } from '@/components/espacos/Indicadores'
import { Alerta, Carregando, ErroCampo, EstadoVazio } from '@/components/estados/Estados'
import { Campo } from '@/components/formulario/Campo'
import { SelectSimples, TODOS } from '@/components/formulario/SelectSimples'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  api,
  DIAS,
  ehErro,
  mensagemAmigavel,
  opcoes,
  TIPOS_ESPACO,
  type Espaco,
  type FiltrosDisponibilidade,
  type TipoEspaco,
} from '@/lib/api'
import { useUsuario } from '@/lib/auth-context'
import { dataFormatada, dataLocal, diaDaSemana, faixaFormatada, minutos } from '@/lib/reservas'
import { useFiltrosUrl } from '@/lib/useFiltrosUrl'

type Erros = { data?: string; horario?: string; capacidade?: string }

const CHAVES = ['data', 'inicio', 'fim', 'capacidade', 'tipo', 'acessivel'] as const

export function Disponibilidade() {
  const usuario = useUsuario()
  const professor = usuario.tipo === 'PROFESSOR'
  const navegar = useNavigate()
  const hoje = dataLocal()

  // O formulário fica na URL: voltar do detalhe de um espaço mantém a busca.
  const { filtros, definir } = useFiltrosUrl(CHAVES)
  const data = filtros.data || hoje
  const inicio = filtros.inicio || '08:00'
  const fim = filtros.fim || '10:00'
  const capacidade = filtros.capacidade || '1'

  const [resultado, setResultado] = useState<{
    filtros: FiltrosDisponibilidade
    espacos: Espaco[]
  } | null>(null)
  const [erros, setErros] = useState<Erros>({})
  const [erroBusca, setErroBusca] = useState('')
  const [buscando, setBuscando] = useState(false)

  const [escolhido, setEscolhido] = useState<Espaco | null>(null)
  const [dialogoAberto, setDialogoAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  /** Qualquer mudança no formulário invalida o resultado anterior (F08, item 5). */
  function alterar(alteracoes: Parameters<typeof definir>[0]) {
    definir(alteracoes)
    setResultado(null)
    setErros({})
    setErroBusca('')
  }

  function validar(): Erros {
    const novos: Erros = {}
    if (!data) novos.data = 'Informe a data.'
    else if (data < hoje) novos.data = 'Escolha hoje ou uma data futura.'
    if (!(minutos(inicio) < minutos(fim)))
      novos.horario = 'O horário de início deve ser anterior ao de fim.'
    const cap = Number(capacidade)
    if (!Number.isInteger(cap) || cap < 1)
      novos.capacidade = 'Informe um número inteiro maior ou igual a 1.'
    return novos
  }

  async function buscar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const novos = validar()
    setErros(novos)
    if (Object.keys(novos).length) return
    const busca: FiltrosDisponibilidade = {
      data,
      inicioMin: minutos(inicio),
      fimMin: minutos(fim),
      capacidadeMin: Number(capacidade),
      tipo: (filtros.tipo as TipoEspaco) || undefined,
      acessivel: Boolean(filtros.acessivel) || undefined,
    }
    setBuscando(true)
    setErroBusca('')
    try {
      setResultado({ filtros: busca, espacos: await api.espacos.disponiveis(busca) })
    } catch (e) {
      setResultado(null)
      setErroBusca(mensagemAmigavel(e))
    } finally {
      setBuscando(false)
    }
  }

  function abrirSolicitacao(espaco: Espaco) {
    setEscolhido(espaco)
    setErroEnvio('')
    setDialogoAberto(true)
  }

  async function solicitar() {
    if (!escolhido || !resultado) return
    const { filtros: busca } = resultado
    setEnviando(true)
    setErroEnvio('')
    try {
      await api.reservas.criar({
        idEspaco: escolhido.id,
        dataInicio: busca.data,
        dataFim: busca.data,
        horarios: [
          { dia: diaDaSemana(busca.data), inicioMin: busca.inicioMin, fimMin: busca.fimMin },
        ],
      })
      setDialogoAberto(false)
      setResultado({
        ...resultado,
        espacos: resultado.espacos.filter((e) => e.id !== escolhido.id),
      })
      toast.success('Solicitação enviada para aprovação', {
        description: `${escolhido.identificacao} · ${dataFormatada(busca.data)} · ${faixaFormatada(busca)}`,
        action: { label: 'Minhas reservas', onClick: () => navegar('/app/minhas-reservas') },
      })
    } catch (e) {
      if (ehErro(e, 'CONFLITO_HORARIO') || ehErro(e, 'ESPACO_EM_MANUTENCAO')) {
        // Outro pedido ocupou o horário ou o espaço saiu de uso: atualiza a lista (F09, itens 3 e 4).
        setDialogoAberto(false)
        toast.error(mensagemAmigavel(e))
        void buscar()
      } else setErroEnvio(mensagemAmigavel(e))
    } finally {
      setEnviando(false)
    }
  }

  const linkSemanal = (espaco: Espaco) =>
    `/app/reservas/nova?${new URLSearchParams({ espaco: String(espaco.id), data, inicio, fim })}`

  return (
    <section aria-labelledby="disponibilidade-titulo" className="flex flex-col gap-4">
      <div>
        <h2 id="disponibilidade-titulo" className="text-xl">
          Disponibilidade
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encontre um espaço livre numa data e faixa de horário.
        </p>
      </div>

      <form
        onSubmit={buscar}
        noValidate
        className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Campo
          id="disp-data"
          rotulo="Data"
          erro={erros.data}
          dica={
            data && !erros.data ? (
              <span className="flex items-center gap-1.5">
                <CalendarBlankIcon /> {DIAS[diaDaSemana(data)]}
              </span>
            ) : undefined
          }
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              min={hoje}
              value={data}
              onChange={(e) => alterar({ data: e.target.value })}
              className="h-10"
            />
          )}
        </Campo>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <Campo id="disp-inicio" rotulo="Início">
              {(props) => (
                <Input
                  {...props}
                  aria-describedby={erros.horario ? 'disp-horario-erro' : undefined}
                  aria-invalid={erros.horario ? true : undefined}
                  type="time"
                  step={300}
                  value={inicio}
                  onChange={(e) => alterar({ inicio: e.target.value })}
                  className="h-10"
                />
              )}
            </Campo>
            <Campo id="disp-fim" rotulo="Fim">
              {(props) => (
                <Input
                  {...props}
                  aria-describedby={erros.horario ? 'disp-horario-erro' : undefined}
                  aria-invalid={erros.horario ? true : undefined}
                  type="time"
                  step={300}
                  value={fim}
                  onChange={(e) => alterar({ fim: e.target.value })}
                  className="h-10"
                />
              )}
            </Campo>
          </div>
          {erros.horario && <ErroCampo id="disp-horario-erro">{erros.horario}</ErroCampo>}
        </div>
        <Campo id="disp-capacidade" rotulo="Capacidade mínima" erro={erros.capacidade}>
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={capacidade}
              onChange={(e) => alterar({ capacidade: e.target.value })}
              className="h-10"
            />
          )}
        </Campo>
        <Campo id="disp-tipo" rotulo="Tipo (opcional)">
          {(props) => (
            <SelectSimples<TipoEspaco>
              {...props}
              valor={(filtros.tipo as TipoEspaco) || TODOS}
              aoMudar={(v) => alterar({ tipo: v === TODOS ? '' : v })}
              rotuloTodos="Qualquer tipo"
              opcoes={opcoes(TIPOS_ESPACO)}
            />
          )}
        </Campo>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <div className="flex min-h-10 items-center gap-2">
            <Checkbox
              id="disp-acessivel"
              checked={Boolean(filtros.acessivel)}
              onCheckedChange={(v) => alterar({ acessivel: v === true ? '1' : '' })}
            />
            <Label htmlFor="disp-acessivel">Só acessíveis para cadeirantes</Label>
          </div>
          <Button type="submit" disabled={buscando} className="h-10 w-full px-4 sm:w-auto">
            <MagnifyingGlassIcon data-icon="inline-start" />
            {buscando ? 'Buscando…' : 'Buscar espaços livres'}
          </Button>
        </div>
      </form>

      {erroBusca && <Alerta>{erroBusca}</Alerta>}
      {buscando && <Carregando texto="Procurando espaços livres…" />}

      {!buscando && resultado && (
        <div className="flex flex-col gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {resultado.espacos.length === 1
              ? '1 espaço livre'
              : `${resultado.espacos.length} espaços livres`}{' '}
            em {dataFormatada(resultado.filtros.data)}, {faixaFormatada(resultado.filtros)}
          </p>
          {resultado.espacos.length === 0 ? (
            <EstadoVazio
              icone={ClockIcon}
              titulo="Nenhum espaço livre nesse horário"
              dica="Tente outro horário, outra data ou uma capacidade menor."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {resultado.espacos.map((espaco) => (
                <li
                  key={espaco.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-background p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="font-bold">
                      <Link to={`/app/espacos/${espaco.id}`} className="hover:underline">
                        {espaco.identificacao}
                      </Link>{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        · {TIPOS_ESPACO[espaco.tipo]}
                      </span>
                    </h3>
                    <Indicadores espaco={espaco} />
                  </div>
                  {/* P11: o administrador consulta, mas não solicita. */}
                  {professor && (
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="ghost">
                        <Link to={linkSemanal(espaco)}>
                          <RepeatIcon data-icon="inline-start" />
                          Reserva semanal
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={() => abrirSolicitacao(espaco)}>
                        <CalendarPlusIcon data-icon="inline-start" />
                        Solicitar
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Confirmacao
        aberto={dialogoAberto}
        aoMudarAberto={setDialogoAberto}
        titulo="Confirmar solicitação"
        descricao="A reserva ficará pendente até a aprovação da administração."
        rotuloConfirmar="Enviar solicitação"
        icone={CalendarPlusIcon}
        processando={enviando}
        erro={erroEnvio}
        aoConfirmar={solicitar}
      >
        {escolhido && resultado && (
          <Resumo
            itens={[
              ['Espaço', `${escolhido.identificacao} · ${TIPOS_ESPACO[escolhido.tipo]}`],
              ['Data', dataFormatada(resultado.filtros.data)],
              [
                'Horário',
                `${DIAS[diaDaSemana(resultado.filtros.data)]} ${faixaFormatada(resultado.filtros)}`,
              ],
            ]}
          />
        )}
      </Confirmacao>
    </section>
  )
}
