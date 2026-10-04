import {
  CaretLeftIcon,
  CaretRightIcon,
  FunnelSimpleIcon,
  ListBulletsIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { Campo } from '@/components/formulario/Campo'
import { SelectSimples, TODOS } from '@/components/formulario/SelectSimples'
import { ReservaItem } from '@/components/reservas/ReservaItem'
import { StatusBadge } from '@/components/reservas/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, opcoes, STATUS_RESERVA, TIPOS_ESPACO, type StatusReserva } from '@/lib/api'
import { horarioFormatado, periodoFormatado } from '@/lib/reservas'
import { useFiltrosUrl } from '@/lib/useFiltrosUrl'
import { useRecurso } from '@/lib/useRecurso'

const POR_PAGINA = 10
const CHAVES = ['status', 'espaco', 'professor', 'de', 'ate', 'pagina'] as const

/** Consulta de todas as reservas, só administrador (F15). */
export function TodasReservas() {
  const { filtros, definir, limpar } = useFiltrosUrl(CHAVES)
  const pagina = Math.max(1, Number(filtros.pagina) || 1)

  const { dados, carregando, erro, recarregar } = useRecurso(
    () =>
      api.reservas.listar({
        status: (filtros.status as StatusReserva) || undefined,
        espacoId: Number(filtros.espaco) || undefined,
        professorId: Number(filtros.professor) || undefined,
        de: filtros.de || undefined,
        ate: filtros.ate || undefined,
        pagina,
        porPagina: POR_PAGINA,
      }),
    [filtros.status, filtros.espaco, filtros.professor, filtros.de, filtros.ate, pagina],
  )
  const { dados: espacos = [] } = useRecurso(() => api.espacos.listar(), [])
  // Ainda não há rota de usuários: a lista de professores sai das próprias reservas.
  const { dados: professores = [] } = useRecurso(async () => {
    const { itens } = await api.reservas.listar({ porPagina: 1000 })
    const porId = new Map(itens.map((r) => [r.professor.id, r.professor.nome]))
    return [...porId]
      .filter(([id, nome]) => id && nome)
      .map(([id, nome]) => ({ valor: String(id), rotulo: nome }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
  }, [])

  const itens = dados?.itens ?? []
  const total = dados?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const primeiro = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const ultimo = Math.min(total, pagina * POR_PAGINA)
  const temFiltro = CHAVES.some((c) => c !== 'pagina' && filtros[c])

  /** Mudar um filtro volta para a primeira página. */
  const filtrar = (alteracoes: Parameters<typeof definir>[0]) =>
    definir({ ...alteracoes, pagina: '' })

  return (
    <section aria-labelledby="todas-titulo" className="flex flex-col gap-4">
      <div>
        <h2 id="todas-titulo" className="text-xl">
          Todas as reservas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte as reservas de todos os espaços e professores.
        </p>
      </div>

      <form
        aria-label="Filtrar reservas"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Campo id="todas-status" rotulo="Status">
          {(props) => (
            <SelectSimples<StatusReserva>
              {...props}
              valor={(filtros.status as StatusReserva) || TODOS}
              aoMudar={(v) => filtrar({ status: v === TODOS ? '' : v })}
              rotuloTodos="Todos"
              opcoes={opcoes(STATUS_RESERVA)}
            />
          )}
        </Campo>
        <Campo id="todas-espaco" rotulo="Espaço">
          {(props) => (
            <SelectSimples
              {...props}
              valor={filtros.espaco || TODOS}
              aoMudar={(v) => filtrar({ espaco: v === TODOS ? '' : v })}
              rotuloTodos="Todos"
              opcoes={espacos.map((e) => ({ valor: String(e.id), rotulo: e.identificacao }))}
            />
          )}
        </Campo>
        <Campo id="todas-professor" rotulo="Professor">
          {(props) => (
            <SelectSimples
              {...props}
              valor={filtros.professor || TODOS}
              aoMudar={(v) => filtrar({ professor: v === TODOS ? '' : v })}
              rotuloTodos="Todos"
              opcoes={professores}
            />
          )}
        </Campo>
        <Campo id="todas-de" rotulo="De">
          {(props) => (
            <Input
              {...props}
              type="date"
              value={filtros.de}
              max={filtros.ate || undefined}
              onChange={(e) => filtrar({ de: e.target.value })}
              className="h-10"
            />
          )}
        </Campo>
        <Campo id="todas-ate" rotulo="Até">
          {(props) => (
            <Input
              {...props}
              type="date"
              value={filtros.ate}
              min={filtros.de || undefined}
              onChange={(e) => filtrar({ ate: e.target.value })}
              className="h-10"
            />
          )}
        </Campo>
        {temFiltro && (
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="button" variant="ghost" onClick={limpar}>
              <FunnelSimpleIcon data-icon="inline-start" />
              Limpar filtros
            </Button>
          </div>
        )}
      </form>

      {carregando ? (
        <Carregando texto="Carregando reservas…" />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarNovamente={recarregar} />
      ) : total === 0 ? (
        <EstadoVazio
          icone={ListBulletsIcon}
          titulo="Nenhuma reserva encontrada"
          dica={temFiltro ? 'Mude ou limpe os filtros.' : 'As reservas aparecerão aqui.'}
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            Mostrando {primeiro}–{ultimo} de {total} {total === 1 ? 'reserva' : 'reservas'}
          </p>

          {/* Celular: cartões. A partir de md: tabela. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {itens.map((reserva) => (
              <ReservaItem key={reserva.id} reserva={reserva} mostrarProfessor />
            ))}
          </ul>
          <div className="hidden rounded-md border border-border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">Espaço</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Horários</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="px-3 align-top">
                      <Link
                        to={`/app/espacos/${r.espaco.id}`}
                        className="font-bold hover:underline"
                      >
                        {r.espaco.identificacao}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {TIPOS_ESPACO[r.espaco.tipo]}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">{r.professor.nome}</TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {periodoFormatado(r.dataInicio, r.dataFim)}
                    </TableCell>
                    <TableCell className="align-top">
                      <ul>
                        {r.horarios.map((h, i) => (
                          <li key={i}>{horarioFormatado(h)}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="px-3 align-top">
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPaginas > 1 && (
            <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={pagina <= 1}
                onClick={() => definir({ pagina: pagina - 1 > 1 ? pagina - 1 : '' })}
              >
                <CaretLeftIcon data-icon="inline-start" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Página {pagina} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                disabled={pagina >= totalPaginas}
                onClick={() => definir({ pagina: pagina + 1 })}
              >
                Próxima
                <CaretRightIcon data-icon="inline-end" />
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
