import {
  BuildingsIcon,
  CalendarBlankIcon,
  MagnifyingGlassIcon,
  TrayIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { Sobrelinha } from '@/components/formulario/Campo'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PendentesContext } from '@/lib/pendentes'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  const { sessao } = useAuth()
  const isAdmin = sessao?.usuario.tipo === 'ADMINISTRADOR'
  const [pendentes, setPendentes] = useState<number | null>(null)

  const atualizarPendentes = useCallback(() => {
    if (!isAdmin) return
    api.reservas
      .pendentes()
      .then((lista) => setPendentes(lista.length))
      .catch(() => setPendentes(null))
  }, [isAdmin])

  useEffect(atualizarPendentes, [atualizarPendentes])

  const contexto = useMemo(
    () => ({ total: pendentes, definir: setPendentes, atualizar: atualizarPendentes }),
    [pendentes, atualizarPendentes],
  )
  const navegacao = isAdmin
    ? [
        { to: '/app/solicitacoes', label: 'Solicitações', Icon: TrayIcon },
        { to: '/app/espacos', label: 'Espaços', Icon: BuildingsIcon },
      ]
    : [
        { to: '/app/minhas-reservas', label: 'Minhas reservas', Icon: CalendarBlankIcon },
        { to: '/app/disponibilidade', label: 'Disponibilidade', Icon: MagnifyingGlassIcon },
        { to: '/app/espacos', label: 'Espaços', Icon: BuildingsIcon },
      ]

  return (
    <PendentesContext.Provider value={contexto}>
      <div className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 border-b border-border pb-5">
          <Sobrelinha>{isAdmin ? 'Área da administração' : 'Área do professor'}</Sobrelinha>
          <h1 className="text-2xl">Olá, {sessao?.usuario.nome}</h1>
        </header>
        <nav
          aria-label="Áreas do sistema"
          className="-mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
        >
          <ul className="flex gap-x-2">
            {navegacao.map(({ to, label, Icon }) => (
              <li key={to} className="shrink-0">
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
                  {to === '/app/solicitacoes' && pendentes !== null && (
                    <span
                      aria-label={`${pendentes} pendentes`}
                      className="rounded-4xl border border-border px-1.5 text-xs font-bold text-foreground tabular-nums"
                    >
                      {pendentes}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Outlet />
      </div>
    </PendentesContext.Provider>
  )
}
