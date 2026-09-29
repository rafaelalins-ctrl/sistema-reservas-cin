import { Link, NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

const links = [{ to: '/', label: 'Início' }]

export function Header() {
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
            {links.map(({ to, label }) => (
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
      </div>
    </header>
  )
}
