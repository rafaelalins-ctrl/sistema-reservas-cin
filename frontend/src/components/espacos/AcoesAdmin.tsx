import { SpinnerIcon, TrashIcon, WrenchIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Confirmacao } from '@/components/Confirmacao'
import { Button } from '@/components/ui/button'
import { api, ehErro, mensagemAmigavel, type Espaco } from '@/lib/api'

function textoReservas(total: number) {
  if (total === 0) return 'Não há reservas pendentes ou aprovadas futuras neste espaço.'
  return total === 1
    ? 'Há 1 reserva pendente ou aprovada futura neste espaço.'
    : `Há ${total} reservas pendentes ou aprovadas futuras neste espaço.`
}

/** "Colocar em manutenção" / "Encerrar manutenção", com aviso de reservas futuras (F17). */
export function BotaoManutencao({
  espaco,
  aoAlterar,
}: {
  espaco: Espaco
  aoAlterar: (atualizado: Espaco) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [futuras, setFuturas] = useState<number | null>(null)
  const [contando, setContando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  const entrar = !espaco.emManutencao

  async function abrir() {
    setErro('')
    setFuturas(null)
    setAberto(true)
    if (!entrar) return
    setContando(true)
    try {
      setFuturas(await api.espacos.contarReservasFuturas(espaco.id))
    } catch {
      setFuturas(null)
    } finally {
      setContando(false)
    }
  }

  async function confirmar() {
    setProcessando(true)
    setErro('')
    try {
      const atualizado = await api.espacos.alterarManutencao(espaco.id, entrar)
      aoAlterar(atualizado)
      toast.success(
        entrar
          ? `${espaco.identificacao} está em manutenção.`
          : `${espaco.identificacao} voltou a aceitar reservas.`,
      )
      setAberto(false)
    } catch (e) {
      setErro(mensagemAmigavel(e))
    } finally {
      setProcessando(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={abrir}>
        <WrenchIcon data-icon="inline-start" />
        {entrar ? 'Colocar em manutenção' : 'Encerrar manutenção'}
      </Button>
      <Confirmacao
        aberto={aberto}
        aoMudarAberto={setAberto}
        titulo={
          entrar
            ? `Colocar ${espaco.identificacao} em manutenção?`
            : `Encerrar a manutenção de ${espaco.identificacao}?`
        }
        descricao={
          entrar
            ? 'O espaço deixa de aparecer na busca de disponibilidade e não aceita novas solicitações.'
            : 'O espaço volta a aparecer na busca de disponibilidade e a aceitar solicitações.'
        }
        rotuloConfirmar={entrar ? 'Colocar em manutenção' : 'Encerrar manutenção'}
        icone={WrenchIcon}
        processando={processando}
        erro={erro}
        aoConfirmar={confirmar}
      >
        {entrar && (
          <p className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
            {contando ? (
              <>
                <SpinnerIcon className="animate-spin" /> Verificando reservas futuras…
              </>
            ) : futuras === null ? (
              'Não foi possível verificar as reservas futuras.'
            ) : (
              <span>
                {textoReservas(futuras)}
                {futuras > 0 && ' Elas continuam válidas; avise os professores, se necessário.'}
              </span>
            )}
          </p>
        )}
      </Confirmacao>
    </>
  )
}

/** Remoção com confirmação; com reservas vinculadas, sugere a manutenção (F16, item 4). */
export function BotaoRemover({ espaco, aoRemover }: { espaco: Espaco; aoRemover: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  async function confirmar() {
    setProcessando(true)
    setErro('')
    try {
      await api.espacos.remover(espaco.id)
      toast.success(`${espaco.identificacao} foi removido.`)
      setAberto(false)
      aoRemover()
    } catch (e) {
      setErro(
        ehErro(e, 'ESPACO_COM_RESERVAS') || ehErro(e, 409)
          ? 'Este espaço tem reservas vinculadas e não pode ser removido. Para tirá-lo de uso, coloque-o em manutenção.'
          : mensagemAmigavel(e),
      )
    } finally {
      setProcessando(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => {
          setErro('')
          setAberto(true)
        }}
      >
        <TrashIcon data-icon="inline-start" />
        Remover
      </Button>
      <Confirmacao
        aberto={aberto}
        aoMudarAberto={setAberto}
        titulo={`Remover ${espaco.identificacao}?`}
        descricao="Esta ação não pode ser desfeita. Espaços com reservas no histórico não podem ser removidos."
        rotuloConfirmar="Remover espaço"
        icone={TrashIcon}
        variante="destructive"
        processando={processando}
        erro={erro}
        aoConfirmar={confirmar}
      />
    </>
  )
}
