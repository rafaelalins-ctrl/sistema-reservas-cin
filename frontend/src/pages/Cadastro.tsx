import { ArrowRightIcon, SpinnerIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

export function Cadastro() {
  const navegar = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.')
      return
    }
    setEnviando(true)
    try {
      const resultado = await api.cadastrarProfessor({ nome, email, senha, departamento })
      toast.success(resultado.mensagem)
      navegar('/login', { replace: true })
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível criar a conta.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-bold text-primary">NOVA CONTA</p>
        <h1 className="text-2xl">Cadastro de professor</h1>
        <p className="text-sm text-muted-foreground">
          Crie uma conta para solicitar e acompanhar reservas.
        </p>
      </header>

      <form
        onSubmit={cadastrar}
        className="flex flex-col gap-5 rounded-md border border-border p-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="cadastro-nome">Nome completo</Label>
          <Input
            id="cadastro-nome"
            autoComplete="name"
            required
            maxLength={120}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cadastro-email">E-mail institucional</Label>
          <Input
            id="cadastro-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cadastro-departamento">Departamento</Label>
          <Input
            id="cadastro-departamento"
            required
            maxLength={120}
            value={departamento}
            onChange={(event) => setDepartamento(event.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cadastro-senha">Senha</Label>
          <Input
            id="cadastro-senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={1024}
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cadastro-confirmacao">Confirmar senha</Label>
          <Input
            id="cadastro-confirmacao"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={1024}
            value={confirmacao}
            onChange={(event) => setConfirmacao(event.target.value)}
            className="h-10"
          />
        </div>
        {erro && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <WarningCircleIcon className="mt-0.5 shrink-0" /> {erro}
          </p>
        )}
        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? <SpinnerIcon className="animate-spin" /> : <ArrowRightIcon />}
          Criar conta
        </Button>
      </form>

      <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Já tem uma conta? Entrar
      </Link>
    </div>
  )
}
