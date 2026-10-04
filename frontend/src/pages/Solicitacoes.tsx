import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Confirmacao, Resumo } from '@/components/Confirmacao'
import { Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { Campo } from '@/components/formulario/Campo'
import { ReservaItem } from '@/components/reservas/ReservaItem'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api, ehErro, mensagemAmigavel, suportaMotivo, TIPOS_ESPACO, type Reserva } from '@/lib/api'
import { usePendentes } from '@/lib/pendentes'
import { horarioFormatado, periodoFormatado } from '@/lib/reservas'
import { useRecurso } from '@/lib/useRecurso'

type Decisao = 'aprovar' | 'rejeitar'

function quandoChegou(criadaEm?: string) {
  if (!criadaEm) return null
  return new Date(criadaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function Solicitacoes() {
  const {
    dados: reservas = [],
    setDados,
    carregando,
    erro,
    recarregar,
  } = useRecurso(() => api.reservas.pendentes(), [])
  const pendentes = usePendentes()

  const [alvo, setAlvo] = useState<{ reserva: Reserva; decisao: Decisao } | null>(null)
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erroAcao, setErroAcao] = useState('')

  // Mantém o contador da aba em dia com a lista carregada.
  const { definir } = pendentes
  useEffect(() => {
    if (!carregando && !erro) definir(reservas.length)
  }, [carregando, erro, reservas.length, definir])

  function abrir(reserva: Reserva, decisao: Decisao) {
    setAlvo({ reserva, decisao })
    setMotivo('')
    setErroAcao('')
    setAberto(true)
  }

  async function confirmar() {
    if (!alvo) return
    const { reserva, decisao } = alvo
    setProcessando(true)
    setErroAcao('')
    try {
      if (decisao === 'aprovar') await api.reservas.aprovar(reserva.id)
      else await api.reservas.rejeitar(reserva.id, suportaMotivo ? motivo : undefined)
      setDados(reservas.filter((item) => item.id !== reserva.id))
      toast.success(
        `Reserva de ${reserva.espaco.identificacao} ${decisao === 'aprovar' ? 'aprovada' : 'rejeitada'}.`,
      )
      setAberto(false)
    } catch (e) {
      if (ehErro(e, 409) || ehErro(e, 404)) {
        toast.error('Esta solicitação já foi decidida. A lista foi atualizada.')
        setAberto(false)
        void recarregar()
      } else setErroAcao(mensagemAmigavel(e))
    } finally {
      setProcessando(false)
    }
  }

  const aprovando = alvo?.decisao === 'aprovar'

  return (
    <section aria-labelledby="solicitacoes-titulo" className="flex flex-col gap-4">
      <div>
        <h2 id="solicitacoes-titulo" className="text-xl">
          Solicitações pendentes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Por ordem de chegada. Pedidos pendentes já bloqueiam o horário para outros professores.
        </p>
      </div>

      {carregando ? (
        <Carregando texto="Carregando solicitações…" />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarNovamente={recarregar} />
      ) : reservas.length === 0 ? (
        <EstadoVazio
          icone={CheckCircleIcon}
          titulo="Nenhuma solicitação pendente"
          dica="As novas solicitações dos professores aparecerão aqui."
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {reservas.length === 1
              ? '1 solicitação aguardando decisão'
              : `${reservas.length} solicitações aguardando decisão`}
          </p>
          <ul className="flex flex-col gap-3">
            {reservas.map((reserva) => (
              <ReservaItem
                key={reserva.id}
                reserva={reserva}
                mostrarProfessor
                acoes={
                  // Na lista, só botões outline: o primário fica dentro da confirmação
                  // (um primário por tela, F14 item 5).
                  <>
                    {quandoChegou(reserva.criadaEm) && (
                      <span className="mr-auto flex items-center gap-1.5 self-center text-xs text-muted-foreground">
                        <ClockIcon /> Recebida em {quandoChegou(reserva.criadaEm)}
                      </span>
                    )}
                    <Button variant="outline" onClick={() => abrir(reserva, 'rejeitar')}>
                      <XCircleIcon data-icon="inline-start" />
                      Rejeitar
                    </Button>
                    <Button variant="outline" onClick={() => abrir(reserva, 'aprovar')}>
                      <CheckCircleIcon data-icon="inline-start" />
                      Aprovar
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        </>
      )}

      <Confirmacao
        aberto={aberto}
        aoMudarAberto={setAberto}
        titulo={aprovando ? 'Aprovar esta solicitação?' : 'Rejeitar esta solicitação?'}
        descricao={
          aprovando
            ? 'O professor verá a reserva como aprovada.'
            : 'O horário fica livre para outras solicitações. Esta ação não pode ser desfeita.'
        }
        rotuloConfirmar={aprovando ? 'Aprovar' : 'Rejeitar'}
        icone={aprovando ? CheckCircleIcon : XCircleIcon}
        variante={aprovando ? 'default' : 'destructive'}
        processando={processando}
        erro={erroAcao}
        aoConfirmar={confirmar}
      >
        {alvo && (
          <>
            <Resumo
              itens={[
                [
                  'Espaço',
                  `${alvo.reserva.espaco.identificacao} · ${TIPOS_ESPACO[alvo.reserva.espaco.tipo]}`,
                ],
                ['Professor', alvo.reserva.professor.nome || '—'],
                ['Período', periodoFormatado(alvo.reserva.dataInicio, alvo.reserva.dataFim)],
                [
                  'Horários',
                  <ul key="h">
                    {alvo.reserva.horarios.map((h, i) => (
                      <li key={i}>{horarioFormatado(h)}</li>
                    ))}
                  </ul>,
                ],
              ]}
            />
            {!aprovando && suportaMotivo && (
              <Campo
                id="rejeitar-motivo"
                rotulo="Motivo (opcional)"
                dica="O professor verá este texto na reserva."
              >
                {(props) => (
                  <Textarea
                    {...props}
                    maxLength={300}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                )}
              </Campo>
            )}
          </>
        )}
      </Confirmacao>
    </section>
  )
}
