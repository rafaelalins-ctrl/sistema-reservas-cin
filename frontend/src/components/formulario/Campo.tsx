import type { ReactNode } from 'react'

import { ErroCampo } from '@/components/estados/Estados'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type PropsAcessiveis = {
  id: string
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
}

/**
 * Rótulo + campo + dica + erro, com aria-invalid e aria-describedby já ligados (PRD, seção 7).
 * O campo vem por render prop para funcionar com Input, Select, Textarea etc.
 */
export function Campo({
  id,
  rotulo,
  erro,
  dica,
  className,
  children,
}: {
  id: string
  rotulo: ReactNode
  erro?: string
  dica?: ReactNode
  className?: string
  children: (props: PropsAcessiveis) => ReactNode
}) {
  const idDica = dica ? `${id}-dica` : undefined
  const idErro = erro ? `${id}-erro` : undefined
  const descricao = [idErro, idDica].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children({ id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': descricao })}
      {dica && (
        <p id={idDica} className="text-xs text-muted-foreground">
          {dica}
        </p>
      )}
      <ErroCampo id={`${id}-erro`}>{erro}</ErroCampo>
    </div>
  )
}

/** Sobrelinha das páginas: texto normal com caixa alta só no CSS (leitores de tela não soletram). */
export function Sobrelinha({ children }: { children: ReactNode }) {
  return <p className="text-sm font-bold tracking-wide text-primary uppercase">{children}</p>
}
