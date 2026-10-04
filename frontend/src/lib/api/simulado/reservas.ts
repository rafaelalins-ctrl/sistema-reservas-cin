import { ApiError } from '@/lib/api/erros'
import { atraso } from '@/lib/api/simulado/atraso'
import { banco, copia, exigirUsuario, proximoId, salvar, validacao } from '@/lib/api/simulado/banco'
import { bloqueia } from '@/lib/api/simulado/regras'
import type { ApiReservas, Conflito, Reserva, StatusReserva } from '@/lib/api/tipos'
import { dataLocal, intervalosConflitam, ocorrencias, validarReserva } from '@/lib/reservas'

function buscar(id: number) {
  const reserva = banco().reservas.find((r) => r.id === id)
  if (!reserva)
    throw new ApiError(404, {
      mensagem: 'Reserva não encontrada.',
      codigo: 'RESERVA_NAO_ENCONTRADA',
    })
  return reserva
}

function statusInvalido(): never {
  throw new ApiError(409, {
    mensagem: 'A reserva não está mais nesse status.',
    codigo: 'STATUS_INVALIDO',
  })
}

/** Mais próximas primeiro (F11, item 4). */
function porDataInicio(a: Reserva, b: Reserva) {
  return a.dataInicio.localeCompare(b.dataInicio) || a.id - b.id
}

function decidir(id: number, status: StatusReserva, motivo?: string) {
  exigirUsuario('ADMINISTRADOR')
  const reserva = buscar(id)
  if (reserva.status !== 'PENDENTE') statusInvalido()
  reserva.status = status
  reserva.motivo = motivo?.trim() || null
  salvar()
}

export const reservasSimulado: ApiReservas = {
  async criar(nova) {
    await atraso()
    const professor = exigirUsuario('PROFESSOR')
    const erros = validarReserva(nova)
    const primeiro =
      erros.dataInicio ?? erros.dataFim ?? erros.horarios ?? Object.values(erros.porHorario)[0]
    if (primeiro) validacao(primeiro)

    const { espacos, reservas } = banco()
    const espaco = espacos.find((e) => e.id === nova.idEspaco)
    if (!espaco)
      throw new ApiError(404, {
        mensagem: 'Espaço não encontrado.',
        codigo: 'ESPACO_NAO_ENCONTRADO',
      })
    if (espaco.emManutencao)
      throw new ApiError(409, {
        mensagem: 'Espaço em manutenção.',
        codigo: 'ESPACO_EM_MANUTENCAO',
      })

    // Como o backend: percorre cada ocorrência do pedido e compara com as reservas que bloqueiam.
    const pedidas = ocorrencias(nova.dataInicio, nova.dataFim, nova.horarios)
    const conflitos: Conflito[] = pedidas.filter((p) =>
      reservas.some(
        (r) =>
          r.espaco.id === espaco.id &&
          bloqueia(r) &&
          ocorrencias(p.data, p.data, r.horarios).some(
            (o) => p.data >= r.dataInicio && p.data <= r.dataFim && intervalosConflitam(o, p),
          ),
      ),
    )
    if (conflitos.length)
      throw new ApiError(409, {
        mensagem: 'Conflito de horário.',
        codigo: 'CONFLITO_HORARIO',
        detalhes: { conflitos },
      })

    const reserva: Reserva = {
      id: proximoId(reservas),
      status: 'PENDENTE',
      dataInicio: nova.dataInicio,
      dataFim: nova.dataFim,
      horarios: copia(nova.horarios),
      espaco: { id: espaco.id, identificacao: espaco.identificacao, tipo: espaco.tipo },
      professor: { id: professor.id, nome: professor.nome, email: professor.email },
      criadaEm: new Date().toISOString(),
      motivo: null,
    }
    reservas.push(reserva)
    salvar()
    return copia(reserva)
  },

  async minhas() {
    await atraso()
    const professor = exigirUsuario('PROFESSOR')
    return copia(
      banco()
        .reservas.filter((r) => r.professor.id === professor.id)
        .sort(porDataInicio),
    )
  },

  async pendentes() {
    await atraso()
    exigirUsuario('ADMINISTRADOR')
    // Mais antigas primeiro: a fila é atendida por ordem de chegada (F14, item 1).
    return copia(
      banco()
        .reservas.filter((r) => r.status === 'PENDENTE')
        .sort((a, b) => (a.criadaEm ?? '').localeCompare(b.criadaEm ?? '') || a.id - b.id),
    )
  },

  async listar(filtros = {}) {
    await atraso()
    exigirUsuario('ADMINISTRADOR')
    const porPagina = filtros.porPagina ?? 10
    const pagina = Math.max(1, filtros.pagina ?? 1)
    const filtradas = banco()
      .reservas.filter(
        (r) =>
          (!filtros.status || r.status === filtros.status) &&
          (!filtros.espacoId || r.espaco.id === filtros.espacoId) &&
          (!filtros.professorId || r.professor.id === filtros.professorId) &&
          // Sobreposição de períodos: a reserva toca o intervalo [de, ate].
          (!filtros.de || r.dataFim >= filtros.de) &&
          (!filtros.ate || r.dataInicio <= filtros.ate),
      )
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio) || b.id - a.id)
    return {
      itens: copia(filtradas.slice((pagina - 1) * porPagina, pagina * porPagina)),
      total: filtradas.length,
    }
  },

  async aprovar(id) {
    await atraso()
    decidir(id, 'APROVADA')
  },

  async rejeitar(id, motivo) {
    await atraso()
    decidir(id, 'REJEITADA', motivo)
  },

  async cancelar(id, motivo) {
    await atraso()
    const professor = exigirUsuario('PROFESSOR')
    const reserva = buscar(id)
    if (reserva.professor.id !== professor.id)
      throw new ApiError(403, { mensagem: 'Sem permissão.', codigo: 'SEM_PERMISSAO' })
    // P7: só reservas que ainda não terminaram podem ser canceladas.
    if (!bloqueia(reserva) || reserva.dataFim < dataLocal()) statusInvalido()
    reserva.status = 'CANCELADA'
    reserva.motivo = motivo?.trim() || null
    salvar()
  },
}
