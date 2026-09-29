import { ArrowRightIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function Home() {
  return (
    <section className="flex max-w-2xl flex-col gap-6 py-10">
      <p className="text-sm font-bold text-primary">Centro de Informática · UFPE</p>
      <h1 className="display text-3xl sm:text-4xl">Reserve o espaço certo para cada encontro.</h1>
      <p className="text-lg text-muted-foreground">
        Salas de aula, laboratórios e auditórios do CIn em um só lugar. As telas do sistema estão em
        construção; enquanto isso, o guia visual reúne a identidade aplicada aos componentes.
      </p>
      <div>
        <Button asChild size="lg">
          <Link to="/style-guide">
            Ver guia visual
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
