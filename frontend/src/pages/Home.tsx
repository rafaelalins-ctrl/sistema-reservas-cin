import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="flex flex-col gap-10 py-8 sm:py-12">
      <header className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm font-bold text-primary">CENTRO DE INFORMÁTICA · UFPE</p>
        <h1 className="display text-3xl sm:text-4xl">Sistema de reservas do CIn</h1>
        <p className="text-lg text-muted-foreground">
          Acesse o portal para consultar agenda de espaços e acompanhar suas solicitações.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link to="/login">Entrar no sistema</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Salas, laboratórios e auditórios</p>
      </div>
    </div>
  )
}
