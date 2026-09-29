import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-2xl">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe.</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
