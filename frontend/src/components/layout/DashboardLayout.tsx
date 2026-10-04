import { BuildingsIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  const { sessao } = useAuth()
  const isAdmin = sessao?.usuario.tipo === 'ADMINISTRADOR'
  const navegacao = isAdmin
    ? [
        { to: '/app/solicitacoes', label: 'Solicitações pendentes', Icon: CalendarBlankIcon },
        { to: '/app/buscar-reservas', label: 'Espaços e agenda', Icon: BuildingsIcon },
      ]
    : [
        { to: '/app/minhas-reservas', label: 'Minhas reservas', Icon: CalendarBlankIcon },
        { to: '/app/buscar-reservas', label: 'Espaços e agenda', Icon: BuildingsIcon },
      ]

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2 border-b border-border pb-5">
        <p className="text-sm font-bold text-primary">
          {isAdmin ? 'ÁREA DA ADMINISTRAÇÃO' : 'ÁREA DO PROFESSOR'}
        </p>
        <h1 className="text-2xl">Olá, {sessao?.usuario.nome}</h1>
      </header>
      <nav aria-label="Reservas" className="border-b border-border">
        <ul className="flex flex-wrap gap-x-2 gap-y-1">
          {navegacao.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-10 items-center gap-2 border-b-2 px-3 text-sm text-muted-foreground hover:text-foreground',
                    isActive && 'border-primary font-bold text-primary',
                    !isActive && 'border-transparent',
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
