import { ArrowRightIcon, SpinnerIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mensagemAmigavel } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function Login() {
  const { sessao, entrar } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (sessao) return <Navigate to="/app" replace />

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await entrar({ email, senha })
      navegar('/app', { replace: true })
    } catch (error) {
      setErro(mensagemAmigavel(error, { 401: 'E-mail ou senha incorretos.' }))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-bold text-primary">ACESSO AO SISTEMA</p>
        <h1 className="text-2xl">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse sua área de reservas.</p>
      </header>
      <form onSubmit={enviar} className="flex flex-col gap-5 rounded-md border border-border p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-email">E-mail institucional</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-senha">Senha</Label>
          <Input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
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
          Acessar reservas
        </Button>
      </form>
      <Link to="/cadastro" className="text-sm text-primary hover:underline">
        Não tem conta? Cadastre-se como professor
      </Link>
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        Voltar para a página inicial
      </Link>
    </div>
  )
}
