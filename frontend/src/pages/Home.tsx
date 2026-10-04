import { ArrowRightIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { Sobrelinha } from '@/components/formulario/Campo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function Home() {
  const { sessao } = useAuth()
  return (
    <div className="flex flex-col gap-10 py-8 sm:py-12">
      <header className="flex max-w-2xl flex-col gap-4">
        <Sobrelinha>Centro de Informática · UFPE</Sobrelinha>
        <h1 className="display text-3xl sm:text-4xl">Reserve o espaço certo para cada encontro.</h1>
        <p className="text-lg text-muted-foreground">
          Salas de aula, laboratórios e auditórios do CIn em um só lugar: veja o que está livre,
          solicite a reserva e acompanhe a aprovação.
        </p>
      </header>
      <div>
        {/* Um único botão primário na tela (identidade do CIn). */}
        <Button asChild size="lg" className="h-11 px-4">
          {sessao ? (
            <Link to="/app">
              {sessao.usuario.tipo === 'ADMINISTRADOR'
                ? 'Ir para as solicitações'
                : 'Ir para minhas reservas'}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          ) : (
            <Link to="/login">
              Entrar no sistema
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          )}
        </Button>
        <p className="text-sm text-muted-foreground">Salas, laboratórios e auditórios</p>
      </div>
    </div>
  )
}
