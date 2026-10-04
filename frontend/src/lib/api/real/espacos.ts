import { request } from '@/lib/api/cliente'
import type { Agenda, ApiEspacos, Espaco, TipoEspaco } from '@/lib/api/tipos'
import { diaDaSemana } from '@/lib/reservas'

// Mantém compatibilidade com respostas parciais de instalações antigas; o backend atual devolve
// todos os campos de `Espaco`.
type EspacoBruto = Partial<Espaco> & { id: number; identificacao: string; tipo?: string }

export function adaptarEspaco(bruto: EspacoBruto): Espaco {
  const base = {
    id: bruto.id,
    identificacao: bruto.identificacao,
    capacidade: bruto.capacidade ?? 0,
    bloco: bruto.bloco ?? 'BLOCO_A',
    mobilia: bruto.mobilia ?? 'CADEIRAS_MOVEIS',
    qtdTomadas: bruto.qtdTomadas ?? 0,
    acessivelCadeirante: bruto.acessivelCadeirante ?? false,
    requerRetiradaChave: bruto.requerRetiradaChave ?? false,
    emManutencao: bruto.emManutencao ?? false,
  }
  const b = bruto as Record<string, unknown>
  switch (bruto.tipo as TipoEspaco) {
    case 'LABORATORIO':
      return {
        ...base,
        tipo: 'LABORATORIO',
        qtdComputadores: (b.qtdComputadores as number) ?? 0,
        softwaresInstalados: (b.softwaresInstalados as string[]) ?? [],
      }
    case 'AUDITORIO':
      return {
        ...base,
        tipo: 'AUDITORIO',
        equipamentoSom: (b.equipamentoSom as boolean) ?? false,
        cabineTraducao: (b.cabineTraducao as boolean) ?? false,
      }
    default:
      return {
        ...base,
        tipo: 'SALA_AULA',
        tipoQuadro: (b.tipoQuadro as 'BRANCO' | 'VIDRO') ?? 'BRANCO',
        possuiProjetor: (b.possuiProjetor as boolean) ?? false,
      }
  }
}

export const espacosReal: ApiEspacos = {
  async listar(filtros = {}) {
    const lista = await request<EspacoBruto[]>('/espacos', { query: filtros })
    return lista.map(adaptarEspaco)
  },

  async obter(id) {
    return adaptarEspaco(await request<EspacoBruto>(`/espacos/${id}`))
  },

  async disponiveis(filtros) {
    const resultado = await request<EspacoBruto[]>('/espacos/disponiveis', {
      query: {
        data: filtros.data,
        inicio: filtros.inicioMin,
        fim: filtros.fimMin,
        capacidadeMin: filtros.capacidadeMin,
        tipo: filtros.tipo,
        acessivel: filtros.acessivel,
        // Compatibilidade com a branch: exige `dia` (redundante) e chama o mínimo de `capacidade`.
        dia: diaDaSemana(filtros.data),
        capacidade: filtros.capacidadeMin ?? 1,
      },
    })
    // Compatibilidade com servidores antigos que devolvem apenas os campos básicos.
    if (resultado.every((e) => e.tipo)) return resultado.map(adaptarEspaco)
    const ids = new Set(resultado.map((e) => e.id))
    const todos = await this.listar()
    return todos.filter(
      (e) =>
        ids.has(e.id) &&
        (!filtros.tipo || e.tipo === filtros.tipo) &&
        (!filtros.acessivel || e.acessivelCadeirante),
    )
  },

  async agenda(id, periodo) {
    return request<Agenda>(`/espacos/${id}/agenda`, { query: periodo })
  },

  async criar(entrada) {
    return adaptarEspaco(await request<EspacoBruto>('/espacos', { method: 'POST', corpo: entrada }))
  },

  async atualizar(id, entrada) {
    return adaptarEspaco(
      await request<EspacoBruto>(`/espacos/${id}`, { method: 'PUT', corpo: entrada }),
    )
  },

  async alterarManutencao(id, emManutencao) {
    return adaptarEspaco(
      await request<EspacoBruto>(`/espacos/${id}`, { method: 'PATCH', corpo: { emManutencao } }),
    )
  },

  async remover(id) {
    await request<void>(`/espacos/${id}`, { method: 'DELETE' })
  },

  async contarReservasFuturas(id) {
    const { total } = await request<{ total: number }>(`/espacos/${id}/reservas-futuras`)
    return total
  },
}
