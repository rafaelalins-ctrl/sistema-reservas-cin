import { SpinnerIcon, type Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { Alerta } from '@/components/estados/Estados'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Diálogo de confirmação das ações de estado (cancelar, aprovar, rejeitar, remover…).
 * O botão de confirmar é o único primário da tela enquanto o diálogo está aberto.
 */
export function Confirmacao({
  aberto,
  aoMudarAberto,
  titulo,
  descricao,
  children,
  rotuloConfirmar,
  rotuloCancelar = 'Voltar',
  icone: Icone,
  variante = 'default',
  processando,
  erro,
  aoConfirmar,
}: {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  titulo: string
  descricao?: ReactNode
  children?: ReactNode
  rotuloConfirmar: string
  rotuloCancelar?: string
  icone?: Icon
  variante?: 'default' | 'destructive'
  processando?: boolean
  erro?: string
  aoConfirmar: () => void
}) {
  return (
    <Dialog open={aberto} onOpenChange={(valor) => !processando && aoMudarAberto(valor)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        {children}
        {erro && <Alerta>{erro}</Alerta>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={processando}>
              {rotuloCancelar}
            </Button>
          </DialogClose>
          <Button variant={variante} disabled={processando} onClick={aoConfirmar}>
            {processando ? <SpinnerIcon className="animate-spin" /> : Icone && <Icone />}
            {rotuloConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Resumo de uma reserva/espaço dentro do diálogo: lista de definições compacta. */
export function Resumo({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-border p-3 text-sm">
      {itens.map(([termo, valor]) => (
        <div key={termo} className="contents">
          <dt className="text-muted-foreground">{termo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}
