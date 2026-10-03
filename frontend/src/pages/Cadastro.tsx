import { ArrowRightIcon, SpinnerIcon } from '@phosphor-icons/react'
import { useRef, useState, type ComponentProps, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Alerta } from '@/components/estados/Estados'
import { Campo, Sobrelinha } from '@/components/formulario/Campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, ApiError, mensagemAmigavel } from '@/lib/api'

type CampoCadastro = 'nome' | 'email' | 'departamento' | 'senha' | 'confirmacao'
type Erros = Partial<Record<CampoCadastro, string>>

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validar(dados: Record<CampoCadastro, string>): Erros {
  const erros: Erros = {}
  if (!dados.nome.trim()) erros.nome = 'Informe seu nome.'
  if (!EMAIL_VALIDO.test(dados.email.trim())) erros.email = 'Informe um e-mail válido.'
  if (!dados.departamento.trim()) erros.departamento = 'Informe seu departamento.'
  if (dados.senha.length < 8 || dados.senha.length > 1024)
    erros.senha = 'A senha deve ter de 8 a 1024 caracteres.'
  if (dados.confirmacao !== dados.senha) erros.confirmacao = 'As senhas não conferem.'
  return erros
}

export function Cadastro() {
  const navegar = useNavigate()
  const formulario = useRef<HTMLFormElement>(null)
  const [dados, setDados] = useState<Record<CampoCadastro, string>>({
    nome: '',
    email: '',
    departamento: '',
    senha: '',
    confirmacao: '',
  })
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  function focar(campo: CampoCadastro) {
    formulario.current?.querySelector<HTMLInputElement>(`#cadastro-${campo}`)?.focus()
  }

  function alterar(campo: CampoCadastro, valor: string) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroGeral('')
    const novos = validar(dados)
    setErros(novos)
    const primeiro = Object.keys(novos)[0] as CampoCadastro | undefined
    if (primeiro) return focar(primeiro)

    setEnviando(true)
    try {
      const { confirmacao: _confirmacao, ...cadastro } = dados
      await api.auth.cadastrar(cadastro)
      toast.success('Conta criada. Entre com seu e-mail e senha.')
      navegar('/login', { replace: true, state: { email: dados.email.trim().toLowerCase() } })
    } catch (e) {
      const mensagem = mensagemAmigavel(e)
      const campo = e instanceof ApiError ? (e.campo as CampoCadastro | undefined) : undefined
      if (campo && campo in dados) {
        setErros({ [campo]: mensagem })
        focar(campo)
      } else setErroGeral(mensagem)
    } finally {
      setEnviando(false)
    }
  }

  const campo = (
    id: CampoCadastro,
    rotulo: string,
    props: ComponentProps<typeof Input>,
    dica?: string,
  ) => (
    <Campo id={`cadastro-${id}`} rotulo={rotulo} erro={erros[id]} dica={dica}>
      {(acessiveis) => (
        <Input
          {...acessiveis}
          {...props}
          value={dados[id]}
          onChange={(event) => alterar(id, event.target.value)}
          className="h-10"
        />
      )}
    </Campo>
  )

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <Sobrelinha>Nova conta</Sobrelinha>
        <h1 className="text-2xl">Cadastro de professor</h1>
        <p className="text-sm text-muted-foreground">
          Crie uma conta para solicitar e acompanhar reservas. Contas de administração são criadas
          pela equipe do CIn.
        </p>
      </header>

      <form
        ref={formulario}
        onSubmit={cadastrar}
        noValidate
        className="flex flex-col gap-5 rounded-md border border-border bg-background p-5"
      >
        {campo('nome', 'Nome completo', { autoComplete: 'name', maxLength: 120 })}
        {campo('email', 'E-mail institucional', {
          type: 'email',
          autoComplete: 'email',
          maxLength: 254,
        })}
        {campo('departamento', 'Departamento', { maxLength: 120 })}
        {campo(
          'senha',
          'Senha',
          { type: 'password', autoComplete: 'new-password', maxLength: 1024 },
          'Mínimo de 8 caracteres.',
        )}
        {campo('confirmacao', 'Confirmar senha', {
          type: 'password',
          autoComplete: 'new-password',
          maxLength: 1024,
        })}
        {erroGeral && <Alerta>{erroGeral}</Alerta>}
        <Button type="submit" disabled={enviando} className="h-10 w-full">
          {enviando ? <SpinnerIcon className="animate-spin" /> : <ArrowRightIcon />}
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Já tem uma conta? Entrar
      </Link>
    </div>
  )
}
