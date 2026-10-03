import { ArrowLeftIcon, BuildingsIcon, CalendarPlusIcon, WrenchIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { AgendaEspaco } from '@/components/espacos/AgendaEspaco'
import { AtributosComuns, AtributosPorTipo } from '@/components/espacos/AtributosEspaco'
import { Indicadores } from '@/components/espacos/Indicadores'
import { Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { Button } from '@/components/ui/button'
import { api, ehErro, TIPOS_ESPACO } from '@/lib/api'
import { useUsuario } from '@/lib/auth-context'
import { useRecurso } from '@/lib/useRecurso'

export function DetalheEspaco() {
  const id = Number(useParams().id)
  const usuario = useUsuario()
  const { hash } = useLocation()
  const {
    dados: espaco,
    carregando,
    erro,
    recarregar,
  } = useRecurso(() => api.espacos.obter(id), [id])

  // Link "Agenda" do catálogo aponta para #agenda.
  useEffect(() => {
    if (espaco && hash === '#agenda') document.getElementById('agenda')?.scrollIntoView()
  }, [espaco, hash])

  const voltar = (
    <Link
      to="/app/espacos"
      className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon /> Espaços
    </Link>
  )

  if (carregando) return <Carregando texto="Carregando espaço…" />
  if (ehErro(erro, 404) || (!erro && !espaco) || Number.isNaN(id))
    return (
      <EstadoVazio
        icone={BuildingsIcon}
        titulo="Espaço não encontrado"
        dica="Ele pode ter sido removido ou o endereço está incorreto."
        acao={
          <Button asChild variant="outline">
            <Link to="/app/espacos">Ver todos os espaços</Link>
          </Button>
        }
      />
    )
  if (erro || !espaco) return <EstadoErro erro={erro} aoTentarNovamente={recarregar} />

  const professor = usuario.tipo === 'PROFESSOR'

  return (
    <article aria-labelledby="espaco-titulo" className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        {voltar}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 id="espaco-titulo" className="text-2xl">
              {espaco.identificacao}{' '}
              <span className="text-base text-muted-foreground">· {TIPOS_ESPACO[espaco.tipo]}</span>
            </h2>
            <Indicadores espaco={espaco} />
          </div>
          {professor && (
            <div className="flex flex-col items-end gap-1">
              {espaco.emManutencao ? (
                <>
                  <Button disabled aria-describedby="motivo-indisponivel">
                    <CalendarPlusIcon data-icon="inline-start" />
                    Solicitar reserva
                  </Button>
                  <p id="motivo-indisponivel" className="text-xs text-muted-foreground">
                    Indisponível durante a manutenção.
                  </p>
                </>
              ) : (
                <Button asChild>
                  <Link to={`/app/reservas/nova?espaco=${espaco.id}`}>
                    <CalendarPlusIcon data-icon="inline-start" />
                    Solicitar reserva
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
        {espaco.emManutencao && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md border border-border bg-muted/60 p-3 text-sm"
          >
            <WrenchIcon className="mt-0.5 shrink-0" />
            Este espaço está em manutenção: não aparece na busca de disponibilidade e não aceita
            novas solicitações. Reservas já feitas continuam valendo.
          </p>
        )}
      </header>

      <div className="grid gap-6 rounded-md border border-border bg-background p-4 sm:p-5">
        <AtributosComuns espaco={espaco} />
        <AtributosPorTipo espaco={espaco} />
      </div>

      <section
        id="agenda"
        aria-labelledby="agenda-titulo"
        className="flex scroll-mt-4 flex-col gap-3"
      >
        <h3 id="agenda-titulo" className="text-lg">
          Agenda
        </h3>
        <AgendaEspaco espacoId={espaco.id} />
      </section>
    </article>
  )
}
