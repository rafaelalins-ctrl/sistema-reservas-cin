import {
  ArrowClockwiseIcon,
  SpinnerIcon,
  WarningCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { mensagemAmigavel } from '@/lib/api'
import { cn } from '@/lib/utils'

// Estados padrão de toda tela que carrega dados (docs/prd.md, seção 4).

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <p
      aria-busy="true"
      aria-live="polite"
      className="flex items-center gap-2 border-y border-border py-8 text-sm text-muted-foreground"
    >
      <SpinnerIcon className="animate-spin" /> {texto}
    </p>
  )
}

export function EstadoVazio({
  icone: Icone,
  titulo,
  dica,
  acao,
}: {
  icone: Icon
  titulo: string
  dica?: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 border-y border-border px-4 py-10 text-center">
      <Icone size={24} className="text-muted-foreground" />
      <p className="font-bold">{titulo}</p>
      {dica && <p className="max-w-md text-sm text-muted-foreground">{dica}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

/** Erro de carregamento, com "Tentar novamente". */
export function EstadoErro({
  erro,
  aoTentarNovamente,
}: {
  erro: unknown
  aoTentarNovamente?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 text-destructive">
        <WarningCircleIcon className="mt-0.5 shrink-0" /> {mensagemAmigavel(erro)}
      </p>
      {aoTentarNovamente && (
        <Button variant="outline" onClick={aoTentarNovamente}>
          <ArrowClockwiseIcon data-icon="inline-start" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

/** Mensagem de erro curta (de uma ação ou de um formulário). */
export function Alerta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive',
        className,
      )}
    >
      <WarningCircleIcon className="mt-0.5 shrink-0" /> {children}
    </p>
  )
}

/** Erro ligado a um campo: use `id` no aria-describedby do campo. */
export function ErroCampo({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-destructive">
      <WarningCircleIcon className="mt-0.5 shrink-0" /> {children}
    </p>
  )
}
