import type { PropsAcessiveis } from '@/components/formulario/Campo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** O Radix não aceita valor vazio num item; "todos" representa a ausência de filtro. */
export const TODOS = 'todos'

/** Select do shadcn com lista de opções, para filtros e formulários. */
export function SelectSimples<V extends string>({
  valor,
  aoMudar,
  opcoes,
  rotuloTodos,
  placeholder,
  className,
  desabilitado,
  ...acessiveis
}: Partial<PropsAcessiveis> & {
  valor: V | typeof TODOS | ''
  aoMudar: (valor: V | typeof TODOS) => void
  opcoes: { valor: V; rotulo: string }[]
  /** Se informado, inclui a opção "sem filtro" no topo. */
  rotuloTodos?: string
  placeholder?: string
  className?: string
  desabilitado?: boolean
}) {
  return (
    <Select
      value={valor || undefined}
      onValueChange={(v) => aoMudar(v as V)}
      disabled={desabilitado}
    >
      <SelectTrigger {...acessiveis} className={cn('h-10 w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {rotuloTodos && <SelectItem value={TODOS}>{rotuloTodos}</SelectItem>}
        {opcoes.map((opcao) => (
          <SelectItem key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
