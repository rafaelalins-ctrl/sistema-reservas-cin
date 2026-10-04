import { ArrowRightIcon, InfoIcon, SpinnerIcon } from '@phosphor-icons/react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Alerta } from '@/components/estados/Estados'
import { Campo, Sobrelinha } from '@/components/formulario/Campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ehErro, mensagemAmigavel, modoSimulado, resetarSimulado, usaSimulado } from '@/lib/api'
import { CONTAS_TESTE, EMAIL_ADMIN_TESTE, SENHA_TESTE } from '@/lib/api/simulado/contas'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

type EstadoNavegacao = { de?: string; email?: string } | null

export function Login() {
  const { sessao, entrar, expirou } = useAuth()
  const navegar = useNavigate()
  const estado = useLocation().state as EstadoNavegacao
  const [email, setEmail] = useState(estado?.email ?? '')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const campoSenha = useRef<HTMLInputElement>(null)

  // Volta para a rota protegida que levou ao login (F03, item 4).
  const destino = estado?.de ?? '/app'
  if (sessao) return <Navigate to={destino} replace />

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await autenticar({ email, senha })
  }

  async function autenticar(credenciais: { email: string; senha: string }) {
    setErro('')
    setEnviando(true)
    try {
      await entrar(credenciais)
      navegar(destino, { replace: true })
    } catch (e) {
      setErro(mensagemAmigavel(e, { 401: 'E-mail ou senha incorretos.' }))
      if (ehErro(e, 401)) {
        setSenha('')
        campoSenha.current?.focus()
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <Sobrelinha>Acesso ao sistema</Sobrelinha>
        <h1 className="text-2xl">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Professores e administradores entram pelo mesmo formulário.
        </p>
      </header>

      {expirou && !erro && <Alerta>Sua sessão expirou. Entre novamente.</Alerta>}

      <form
        onSubmit={enviar}
        className="flex flex-col gap-5 rounded-md border border-border bg-background p-5"
      >
        <Campo id="login-email" rotulo="E-mail institucional">
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10"
            />
          )}
        </Campo>
        <Campo id="login-senha" rotulo="Senha">
          {(props) => (
            <Input
              {...props}
              ref={campoSenha}
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="h-10"
            />
          )}
        </Campo>
        {erro && <Alerta>{erro}</Alerta>}
        <Button type="submit" disabled={enviando} className="h-10 w-full">
          {enviando ? <SpinnerIcon className="animate-spin" /> : <ArrowRightIcon />}
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      {usaSimulado('auth') && (
        <ContasDeTeste
          desabilitado={enviando}
          aoEntrarComoAdmin={() => autenticar({ email: EMAIL_ADMIN_TESTE, senha: SENHA_TESTE })}
        />
      )}
      {!usaSimulado('auth') && modoSimulado && (
        <p className="text-xs text-muted-foreground">
          Parte da API está simulada nesta execução (VITE_API_SIMULADA).
        </p>
      )}

      <Link to="/cadastro" className="text-sm text-primary hover:underline">
        Não tem conta? Cadastre-se como professor
      </Link>
    </div>
  )
}

/** Só no modo simulado: as contas de teste existem apenas em lib/api/simulado/dados.ts. */
function ContasDeTeste({
  desabilitado,
  aoEntrarComoAdmin,
}: {
  desabilitado: boolean
  aoEntrarComoAdmin: () => Promise<void>
}) {
  return (
    <aside
      aria-label="Modo simulado"
      className="flex flex-col gap-2 rounded-md border border-dashed border-border p-4 text-sm"
    >
      <p className="flex items-center gap-2 font-bold">
        <InfoIcon /> Modo simulado
      </p>
      <p className="text-muted-foreground">
        Os dados ficam no navegador. Contas de teste (senha <code>{SENHA_TESTE}</code>):
      </p>
      <ul className="flex flex-col gap-1">
        {CONTAS_TESTE.map((conta) => (
          <li key={conta.email}>
            <code>{conta.email}</code> · {conta.perfil}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={desabilitado}
        onClick={() => void aoEntrarComoAdmin()}
      >
        <ArrowRightIcon data-icon="inline-start" />
        Entrar como administradora
      </Button>
      <Button
        variant="link"
        className="h-auto self-start p-0"
        onClick={async () => {
          await resetarSimulado()
          toast.success('Dados de exemplo restaurados.')
        }}
      >
        Restaurar dados de exemplo
      </Button>
    </aside>
  )
}
