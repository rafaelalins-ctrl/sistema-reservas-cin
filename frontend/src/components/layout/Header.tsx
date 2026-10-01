import { Link, NavLink } from 'react-router-dom'
import { SignOutIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Início' },
]

export function Header() {
  const { sessao, sair } = useAuth()
  const linksAtivos = sessao
    ? [
        ...links,
        {
          to:
            sessao.usuario.tipo === 'ADMINISTRADOR' ? '/app/solicitacoes' : '/app/minhas-reservas',
          label: 'Reservas',
        },
      ]
    : links

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo provisório em texto até recebermos o SVG oficial (docs/decisoes/007-logo-provisorio.md). */}
        <Link to="/" className="flex items-baseline gap-2 rounded-sm">
          <span className="text-xl font-bold tracking-title text-primary">CIn</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            UFPE · Reserva de espaços
          </span>
        </Link>
        <nav aria-label="Principal">
          <ul className="flex items-center gap-1">
            {linksAtivos.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm hover:bg-accent',
                      isActive && 'font-bold text-primary',
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {sessao ? (
          <Button variant="ghost" size="sm" onClick={sair}>
            <SignOutIcon data-icon="inline-start" />
            Sair
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
