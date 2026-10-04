import { WarningCircleIcon } from '@phosphor-icons/react'
import { Link, useRouteError } from 'react-router-dom'

import { Button } from '@/components/ui/button'

/** errorElement das rotas: falhas inesperadas de renderização (PRD, seção 7). */
export function ErroInesperado() {
  const erro = useRouteError()
  if (import.meta.env.DEV) console.error(erro)
  return (
    <section role="alert" className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
      <WarningCircleIcon size={32} className="text-destructive" />
      <h1 className="text-2xl">Algo deu errado nesta tela</h1>
      <p className="text-muted-foreground">
        Tente recarregar a página. Se o problema continuar, avise a equipe do sistema.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </section>
  )
}
