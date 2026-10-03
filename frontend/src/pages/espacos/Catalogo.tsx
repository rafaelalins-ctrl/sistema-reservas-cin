import {
  BuildingsIcon,
  CalendarBlankIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { Carregando, EstadoErro, EstadoVazio } from '@/components/estados/Estados'
import { Indicadores } from '@/components/espacos/Indicadores'
import { Campo } from '@/components/formulario/Campo'
import { SelectSimples, TODOS } from '@/components/formulario/SelectSimples'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, BLOCOS, opcoes, TIPOS_ESPACO, type Bloco, type TipoEspaco } from '@/lib/api'
import { useUsuario } from '@/lib/auth-context'
import { normalizarBusca } from '@/lib/reservas'
import { useFiltrosUrl } from '@/lib/useFiltrosUrl'
import { useRecurso } from '@/lib/useRecurso'

const CHAVES = ['q', 'tipo', 'bloco', 'capacidade', 'acessivel'] as const

export function Catalogo() {
  const usuario = useUsuario()
  const admin = usuario.tipo === 'ADMINISTRADOR'
  const {
    dados: espacos = [],
    carregando,
    erro,
    recarregar,
  } = useRecurso(() => api.espacos.listar(), [])
  const { filtros, definir, limpar } = useFiltrosUrl(CHAVES)
  const capacidadeMin = Number(filtros.capacidade) || 0
  const busca = normalizarBusca(filtros.q.trim())

  // Filtra no cliente: a lista é pequena e a busca responde a cada tecla.
  const exibidos = espacos.filter(
    (e) =>
      (!busca || normalizarBusca(`${e.identificacao} ${TIPOS_ESPACO[e.tipo]}`).includes(busca)) &&
      (!filtros.tipo || e.tipo === filtros.tipo) &&
      (!filtros.bloco || e.bloco === filtros.bloco) &&
      e.capacidade >= capacidadeMin &&
      (!filtros.acessivel || e.acessivelCadeirante),
  )
  const temFiltro = CHAVES.some((c) => filtros[c])

  return (
    <section aria-labelledby="catalogo-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="catalogo-titulo" className="text-xl">
            Espaços
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Salas de aula, laboratórios e auditórios do CIn.
          </p>
        </div>
        {admin ? (
          <Button asChild>
            <Link to="/app/espacos/novo">
              <PlusIcon data-icon="inline-start" />
              Novo espaço
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/app/disponibilidade">
              <MagnifyingGlassIcon data-icon="inline-start" />
              Ver disponibilidade
            </Link>
          </Button>
        )}
      </div>
      <form
        role="search"
        aria-label="Filtrar espaços"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr]"
      >
        <Campo
          id="catalogo-busca"
          rotulo="Buscar por nome ou código"
          className="sm:col-span-2 lg:col-span-1"
        >
          {(props) => (
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...props}
                type="search"
                value={filtros.q}
                placeholder="Ex.: A001, laboratório"
                onChange={(e) => definir({ q: e.target.value })}
                className="h-10 pl-9"
              />
            </div>
          )}
        </Campo>
        <Campo id="catalogo-tipo" rotulo="Tipo">
          {(props) => (
            <SelectSimples<TipoEspaco>
              {...props}
              valor={(filtros.tipo as TipoEspaco) || TODOS}
              aoMudar={(v) => definir({ tipo: v === TODOS ? '' : v })}
              rotuloTodos="Todos os tipos"
              opcoes={opcoes(TIPOS_ESPACO)}
            />
          )}
        </Campo>
        <Campo id="catalogo-bloco" rotulo="Bloco">
          {(props) => (
            <SelectSimples<Bloco>
              {...props}
              valor={(filtros.bloco as Bloco) || TODOS}
              aoMudar={(v) => definir({ bloco: v === TODOS ? '' : v })}
              rotuloTodos="Todos os blocos"
              opcoes={opcoes(BLOCOS)}
            />
          )}
        </Campo>
        <Campo id="catalogo-capacidade" rotulo="Capacidade mínima">
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={filtros.capacidade}
              onChange={(e) => definir({ capacidade: e.target.value })}
              className="h-10"
            />
          )}
        </Campo>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <div className="flex min-h-10 items-center gap-2">
            <Checkbox
              id="catalogo-acessivel"
              checked={Boolean(filtros.acessivel)}
              onCheckedChange={(v) => definir({ acessivel: v === true ? '1' : '' })}
            />
            <Label htmlFor="catalogo-acessivel">Só acessíveis para cadeirantes</Label>
          </div>
          {temFiltro && (
            <Button type="button" variant="ghost" onClick={limpar}>
              <FunnelSimpleIcon data-icon="inline-start" />
              Limpar filtros
            </Button>
          )}
        </div>
      </form>

      {carregando ? (
        <Carregando texto="Carregando espaços…" />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarNovamente={recarregar} />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            {exibidos.length} de {espacos.length} espaços
          </p>
          {exibidos.length === 0 ? (
            <EstadoVazio
              icone={BuildingsIcon}
              titulo="Nenhum espaço com esses filtros"
              dica="Tente outro tipo, bloco ou uma capacidade menor."
              acao={
                temFiltro && (
                  <Button variant="outline" onClick={limpar}>
                    Limpar filtros
                  </Button>
                )
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exibidos.map((espaco) => (
                <li
                  key={espaco.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-background p-4"
                >
                  <div>
                    <h3 className="font-bold">
                      <Link to={`/app/espacos/${espaco.id}`} className="hover:underline">
                        {espaco.identificacao}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground">{TIPOS_ESPACO[espaco.tipo]}</p>
                  </div>
                  <Indicadores espaco={espaco} />
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button asChild variant="outline">
                      <Link to={`/app/espacos/${espaco.id}`}>Detalhes</Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link to={`/app/espacos/${espaco.id}#agenda`}>
                        <CalendarBlankIcon data-icon="inline-start" />
                        Agenda
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
