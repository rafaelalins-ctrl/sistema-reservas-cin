import { ArrowLeftIcon, FloppyDiskIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Alerta, Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { Campo, Sobrelinha } from '@/components/formulario/Campo'
import { SelectSimples } from '@/components/formulario/SelectSimples'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  api,
  ApiError,
  BLOCOS,
  ehErro,
  mensagemAmigavel,
  MOBILIAS,
  opcoes,
  QUADROS,
  TIPOS_ESPACO,
  type Bloco,
  type Espaco,
  type EspacoEntrada,
  type Mobilia,
  type TipoEspaco,
  type TipoQuadro,
} from '@/lib/api'
import { useRecurso } from '@/lib/useRecurso'

/** Estado do formulário: números como texto enquanto o usuário digita. */
type Form = {
  tipo: TipoEspaco | ''
  identificacao: string
  capacidade: string
  bloco: Bloco | ''
  mobilia: Mobilia | ''
  qtdTomadas: string
  acessivelCadeirante: boolean
  requerRetiradaChave: boolean
  emManutencao: boolean
  tipoQuadro: TipoQuadro
  possuiProjetor: boolean
  qtdComputadores: string
  softwaresInstalados: string[]
  equipamentoSom: boolean
  cabineTraducao: boolean
}

type CampoForm = keyof Form
type Erros = Partial<Record<CampoForm, string>>

const VAZIO: Form = {
  tipo: '',
  identificacao: '',
  capacidade: '',
  bloco: '',
  mobilia: '',
  qtdTomadas: '0',
  acessivelCadeirante: false,
  requerRetiradaChave: false,
  emManutencao: false,
  tipoQuadro: 'BRANCO',
  possuiProjetor: false,
  qtdComputadores: '0',
  softwaresInstalados: [],
  equipamentoSom: false,
  cabineTraducao: false,
}

function paraForm(e: Espaco): Form {
  return {
    ...VAZIO,
    ...e,
    capacidade: String(e.capacidade),
    qtdTomadas: String(e.qtdTomadas),
    ...(e.tipo === 'LABORATORIO' ? { qtdComputadores: String(e.qtdComputadores) } : {}),
  } as Form
}

const inteiro = (valor: string) => (/^\d+$/.test(valor.trim()) ? Number(valor) : Number.NaN)

function validar(f: Form): Erros {
  const erros: Erros = {}
  if (!f.tipo) erros.tipo = 'Escolha o tipo.'
  if (!f.identificacao.trim()) erros.identificacao = 'Informe a identificação.'
  if (!(inteiro(f.capacidade) > 0)) erros.capacidade = 'Informe um número inteiro maior que zero.'
  if (!f.bloco) erros.bloco = 'Escolha o bloco.'
  if (!f.mobilia) erros.mobilia = 'Escolha a mobília.'
  if (!(inteiro(f.qtdTomadas) >= 0))
    erros.qtdTomadas = 'Informe um número inteiro maior ou igual a zero.'
  if (f.tipo === 'LABORATORIO' && !(inteiro(f.qtdComputadores) >= 0))
    erros.qtdComputadores = 'Informe um número inteiro maior ou igual a zero.'
  return erros
}

function paraEntrada(f: Form): EspacoEntrada {
  const base = {
    identificacao: f.identificacao.trim(),
    capacidade: inteiro(f.capacidade),
    bloco: f.bloco as Bloco,
    mobilia: f.mobilia as Mobilia,
    qtdTomadas: inteiro(f.qtdTomadas),
    acessivelCadeirante: f.acessivelCadeirante,
    requerRetiradaChave: f.requerRetiradaChave,
    emManutencao: f.emManutencao,
  }
  switch (f.tipo) {
    case 'LABORATORIO':
      return {
        ...base,
        tipo: 'LABORATORIO',
        qtdComputadores: inteiro(f.qtdComputadores),
        softwaresInstalados: f.softwaresInstalados,
      }
    case 'AUDITORIO':
      return {
        ...base,
        tipo: 'AUDITORIO',
        equipamentoSom: f.equipamentoSom,
        cabineTraducao: f.cabineTraducao,
      }
    default:
      return {
        ...base,
        tipo: 'SALA_AULA',
        tipoQuadro: f.tipoQuadro,
        possuiProjetor: f.possuiProjetor,
      }
  }
}

/** Criação (/app/espacos/novo) e edição (/app/espacos/:id/editar), só administrador (F16). */
export function FormularioEspaco() {
  const { id } = useParams()
  const edicao = id !== undefined
  const original = useRecurso(
    () => (edicao ? api.espacos.obter(Number(id)) : Promise.resolve(null)),
    [id],
  )

  if (original.carregando) return <Carregando texto="Carregando espaço…" />
  if (edicao && ehErro(original.erro, 404))
    return (
      <EstadoVazio
        icone={XIcon}
        titulo="Espaço não encontrado"
        acao={
          <Button asChild variant="outline">
            <Link to="/app/espacos">Ver todos os espaços</Link>
          </Button>
        }
      />
    )
  if (original.erro)
    return <EstadoErro erro={original.erro} aoTentarNovamente={original.recarregar} />

  return <EditorEspaco key={id ?? 'novo'} id={id} original={original.dados ?? null} />
}

function EditorEspaco({ id, original }: { id?: string; original: Espaco | null }) {
  const edicao = id !== undefined
  const navegar = useNavigate()
  const [form, setForm] = useState<Form>(() => (original ? paraForm(original) : VAZIO))
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [novoSoftware, setNovoSoftware] = useState('')

  function alterar<C extends CampoForm>(campo: C, valor: Form[C]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  function adicionarSoftware() {
    const nome = novoSoftware.trim()
    if (!nome) return
    if (!form.softwaresInstalados.some((s) => s.toLowerCase() === nome.toLowerCase()))
      alterar('softwaresInstalados', [...form.softwaresInstalados, nome])
    setNovoSoftware('')
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroGeral('')
    const novos = validar(form)
    setErros(novos)
    const primeiro = Object.keys(novos)[0]
    if (primeiro) {
      document.getElementById(`espaco-${primeiro}`)?.focus()
      return
    }
    setEnviando(true)
    try {
      const entrada = paraEntrada(form)
      const salvo = edicao
        ? await api.espacos.atualizar(Number(id), entrada)
        : await api.espacos.criar(entrada)
      toast.success(
        edicao ? `${salvo.identificacao} atualizado.` : `${salvo.identificacao} cadastrado.`,
      )
      navegar(`/app/espacos/${salvo.id}`, { replace: true })
    } catch (e) {
      const mensagem = mensagemAmigavel(e)
      const campo = e instanceof ApiError ? (e.campo as CampoForm | undefined) : undefined
      if (campo && campo in VAZIO) {
        setErros({ [campo]: mensagem })
        document.getElementById(`espaco-${campo}`)?.focus()
      } else setErroGeral(mensagem)
    } finally {
      setEnviando(false)
    }
  }

  const caixa = (campo: CampoForm, rotulo: string) => (
    <div className="flex min-h-10 items-center gap-2">
      <Checkbox
        id={`espaco-${campo}`}
        checked={form[campo] as boolean}
        onCheckedChange={(v) => alterar(campo, (v === true) as Form[typeof campo])}
      />
      <Label htmlFor={`espaco-${campo}`}>{rotulo}</Label>
    </div>
  )

  const numero = (campo: 'capacidade' | 'qtdTomadas' | 'qtdComputadores', rotulo: string) => (
    <Campo id={`espaco-${campo}`} rotulo={rotulo} erro={erros[campo]}>
      {(props) => (
        <Input
          {...props}
          type="number"
          inputMode="numeric"
          min={campo === 'capacidade' ? 1 : 0}
          step={1}
          value={form[campo]}
          onChange={(e) => alterar(campo, e.target.value)}
          className="h-10"
        />
      )}
    </Campo>
  )

  return (
    <section aria-labelledby="form-espaco-titulo" className="flex max-w-3xl flex-col gap-5">
      <Link
        to={edicao ? `/app/espacos/${id}` : '/app/espacos'}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon /> {edicao ? 'Voltar ao espaço' : 'Espaços'}
      </Link>
      <div>
        <Sobrelinha>Gestão de espaços</Sobrelinha>
        <h2 id="form-espaco-titulo" className="mt-1 text-xl">
          {edicao ? `Editar ${original?.identificacao}` : 'Novo espaço'}
        </h2>
      </div>

      <form onSubmit={salvar} noValidate className="flex flex-col gap-5">
        <fieldset className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-bold">Dados gerais</legend>
          <Campo
            id="espaco-tipo"
            rotulo="Tipo"
            erro={erros.tipo}
            dica={edicao ? 'O tipo não pode mudar depois de criado.' : undefined}
          >
            {(props) => (
              <SelectSimples<TipoEspaco>
                {...props}
                valor={form.tipo}
                aoMudar={(v) => alterar('tipo', v as TipoEspaco)}
                placeholder="Escolha o tipo"
                opcoes={opcoes(TIPOS_ESPACO)}
                desabilitado={edicao}
              />
            )}
          </Campo>
          <Campo
            id="espaco-identificacao"
            rotulo="Identificação"
            erro={erros.identificacao}
            dica="Código único, como A001 ou LAB-G1."
          >
            {(props) => (
              <Input
                {...props}
                maxLength={20}
                value={form.identificacao}
                onChange={(e) => alterar('identificacao', e.target.value.toUpperCase())}
                className="h-10"
              />
            )}
          </Campo>
          {numero('capacidade', 'Capacidade (pessoas)')}
          {numero('qtdTomadas', 'Tomadas')}
          <Campo id="espaco-bloco" rotulo="Bloco" erro={erros.bloco}>
            {(props) => (
              <SelectSimples<Bloco>
                {...props}
                valor={form.bloco}
                aoMudar={(v) => alterar('bloco', v as Bloco)}
                placeholder="Escolha o bloco"
                opcoes={opcoes(BLOCOS)}
              />
            )}
          </Campo>
          <Campo id="espaco-mobilia" rotulo="Mobília" erro={erros.mobilia}>
            {(props) => (
              <SelectSimples<Mobilia>
                {...props}
                valor={form.mobilia}
                aoMudar={(v) => alterar('mobilia', v as Mobilia)}
                placeholder="Escolha a mobília"
                opcoes={opcoes(MOBILIAS)}
              />
            )}
          </Campo>
          <div className="flex flex-col gap-1 sm:col-span-2">
            {caixa('acessivelCadeirante', 'Acessível para cadeirantes')}
            {caixa('requerRetiradaChave', 'Requer retirada de chave')}
            {!edicao && caixa('emManutencao', 'Cadastrar já em manutenção')}
          </div>
        </fieldset>

        {form.tipo === 'SALA_AULA' && (
          <fieldset className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-bold">Sala de aula</legend>
            <Campo id="espaco-tipoQuadro" rotulo="Quadro">
              {(props) => (
                <SelectSimples<TipoQuadro>
                  {...props}
                  valor={form.tipoQuadro}
                  aoMudar={(v) => alterar('tipoQuadro', v as TipoQuadro)}
                  opcoes={opcoes(QUADROS)}
                />
              )}
            </Campo>
            <div className="flex items-end">{caixa('possuiProjetor', 'Possui projetor')}</div>
          </fieldset>
        )}

        {form.tipo === 'LABORATORIO' && (
          <fieldset className="grid gap-4 rounded-md border border-border bg-background p-4">
            <legend className="px-1 text-sm font-bold">Laboratório</legend>
            <div className="sm:w-1/2">{numero('qtdComputadores', 'Computadores')}</div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="espaco-software">Softwares instalados</Label>
              <div className="flex gap-2">
                <Input
                  id="espaco-software"
                  value={novoSoftware}
                  placeholder="Ex.: Python 3"
                  onChange={(e) => setNovoSoftware(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      adicionarSoftware()
                    }
                  }}
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={adicionarSoftware}
                >
                  <PlusIcon data-icon="inline-start" />
                  Adicionar
                </Button>
              </div>
              {form.softwaresInstalados.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum software informado</p>
              ) : (
                <ul aria-label="Softwares adicionados" className="flex flex-wrap gap-2">
                  {form.softwaresInstalados.map((software) => (
                    <li
                      key={software}
                      className="flex items-center gap-1 rounded-4xl border border-border py-0.5 pr-1 pl-2.5 text-sm"
                    >
                      {software}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remover ${software}`}
                        onClick={() =>
                          alterar(
                            'softwaresInstalados',
                            form.softwaresInstalados.filter((s) => s !== software),
                          )
                        }
                      >
                        <XIcon />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>
        )}

        {form.tipo === 'AUDITORIO' && (
          <fieldset className="flex flex-col gap-1 rounded-md border border-border bg-background p-4">
            <legend className="px-1 text-sm font-bold">Auditório</legend>
            {caixa('equipamentoSom', 'Equipamento de som')}
            {caixa('cabineTraducao', 'Cabine de tradução')}
          </fieldset>
        )}

        {erroGeral && <Alerta>{erroGeral}</Alerta>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="ghost" className="h-10">
            <Link to={edicao ? `/app/espacos/${id}` : '/app/espacos'}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={enviando} className="h-10 px-4">
            <FloppyDiskIcon data-icon="inline-start" />
            {enviando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Cadastrar espaço'}
          </Button>
        </div>
      </form>
    </section>
  )
}
