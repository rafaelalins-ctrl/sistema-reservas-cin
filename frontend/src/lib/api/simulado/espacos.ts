import { ApiError } from '@/lib/api/erros'
import { atraso } from '@/lib/api/simulado/atraso'
import { banco, copia, exigirUsuario, proximoId, salvar, validacao } from '@/lib/api/simulado/banco'
import { bloqueia } from '@/lib/api/simulado/regras'
import type { ApiEspacos, Espaco, EspacoEntrada, Ocupacao } from '@/lib/api/tipos'
import { usuarioAtual } from '@/lib/api/sessao'
import { dataLocal, horarioValido, intervalosConflitam, ocorrencias } from '@/lib/reservas'

function buscar(id: number) {
  const espaco = banco().espacos.find((e) => e.id === id)
  if (!espaco)
    throw new ApiError(404, { mensagem: 'Espaço não encontrado.', codigo: 'ESPACO_NAO_ENCONTRADO' })
  return espaco
}

function porIdentificacao(a: Espaco, b: Espaco) {
  return a.identificacao.localeCompare(b.identificacao, 'pt-BR', { numeric: true })
}

function validarEntrada(entrada: EspacoEntrada, idAtual?: number): EspacoEntrada {
  const identificacao = entrada.identificacao.trim().toUpperCase()
  if (!identificacao) validacao('Informe a identificação.', 'identificacao')
  if (!Number.isInteger(entrada.capacidade) || entrada.capacidade <= 0)
    validacao('A capacidade deve ser um número inteiro maior que zero.', 'capacidade')
  if (!Number.isInteger(entrada.qtdTomadas) || entrada.qtdTomadas < 0)
    validacao(
      'A quantidade de tomadas deve ser um número inteiro maior ou igual a zero.',
      'qtdTomadas',
    )
  if (
    entrada.tipo === 'LABORATORIO' &&
    (!Number.isInteger(entrada.qtdComputadores) || entrada.qtdComputadores < 0)
  )
    validacao(
      'A quantidade de computadores deve ser um número inteiro maior ou igual a zero.',
      'qtdComputadores',
    )
  const duplicado = banco().espacos.some(
    (e) => e.identificacao.toUpperCase() === identificacao && e.id !== idAtual,
  )
  if (duplicado)
    throw new ApiError(409, {
      mensagem: 'Já existe um espaço com essa identificação.',
      codigo: 'IDENTIFICACAO_DUPLICADA',
      campo: 'identificacao',
    })
  const limpa = { ...entrada, identificacao }
  if (limpa.tipo === 'LABORATORIO')
    limpa.softwaresInstalados = limpa.softwaresInstalados.map((s) => s.trim()).filter(Boolean)
  return limpa
}

export const espacosSimulado: ApiEspacos = {
  async listar(filtros = {}) {
    await atraso()
    return copia(
      banco()
        .espacos.filter(
          (e) =>
            (!filtros.tipo || e.tipo === filtros.tipo) &&
            (!filtros.bloco || e.bloco === filtros.bloco) &&
            (!filtros.capacidadeMin || e.capacidade >= filtros.capacidadeMin) &&
            (!filtros.acessivel || e.acessivelCadeirante),
        )
        .sort(porIdentificacao),
    )
  },

  async obter(id) {
    await atraso()
    return copia(buscar(id))
  },

  async disponiveis(filtros) {
    await atraso()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filtros.data)) validacao('Informe uma data válida.', 'data')
    if (!horarioValido(filtros))
      validacao('O horário de início deve ser anterior ao de fim.', 'inicio')
    const { espacos, reservas } = banco()
    const faixa = { inicioMin: filtros.inicioMin, fimMin: filtros.fimMin }
    const ocupado = (idEspaco: number) =>
      reservas.some(
        (r) =>
          r.espaco.id === idEspaco &&
          bloqueia(r) &&
          ocorrencias(filtros.data, filtros.data, r.horarios).some(
            (o) => o.data >= r.dataInicio && o.data <= r.dataFim && intervalosConflitam(o, faixa),
          ),
      )
    return copia(
      espacos
        .filter(
          (e) =>
            !e.emManutencao &&
            (!filtros.capacidadeMin || e.capacidade >= filtros.capacidadeMin) &&
            (!filtros.tipo || e.tipo === filtros.tipo) &&
            (!filtros.acessivel || e.acessivelCadeirante) &&
            !ocupado(e.id),
        )
        .sort(porIdentificacao),
    )
  },

  async agenda(id, { de, ate }) {
    await atraso()
    buscar(id)
    if (ate < de) validacao('O fim do período deve ser igual ou posterior ao início.', 'ate')
    const admin = usuarioAtual()?.tipo === 'ADMINISTRADOR'
    const ocupacoes: Ocupacao[] = banco()
      .reservas.filter((r) => r.espaco.id === id && bloqueia(r))
      .flatMap((r) => {
        const inicio = r.dataInicio > de ? r.dataInicio : de
        const fim = r.dataFim < ate ? r.dataFim : ate
        return ocorrencias(inicio, fim, r.horarios).map((o) => ({
          idReserva: r.id,
          ...o,
          status: r.status as Ocupacao['status'],
          ...(admin ? { professor: { id: r.professor.id, nome: r.professor.nome } } : {}),
        }))
      })
      .sort((a, b) => a.data.localeCompare(b.data) || a.inicioMin - b.inicioMin)
    return { espacoId: id, ocupacoes }
  },

  async criar(entrada) {
    await atraso()
    exigirUsuario('ADMINISTRADOR')
    const { espacos } = banco()
    const novo = { ...validarEntrada(entrada), id: proximoId(espacos) } as Espaco
    espacos.push(novo)
    salvar()
    return copia(novo)
  },

  async atualizar(id, entrada) {
    await atraso()
    exigirUsuario('ADMINISTRADOR')
    const atual = buscar(id)
    if (atual.tipo !== entrada.tipo)
      validacao('O tipo de um espaço não pode mudar depois de criado.', 'tipo')
    const atualizado = { ...validarEntrada(entrada, id), id } as Espaco
    const { espacos, reservas } = banco()
    espacos[espacos.indexOf(atual)] = atualizado
    // Mantém a cópia resumida do espaço nas reservas (como faria um JOIN no backend).
    for (const r of reservas)
      if (r.espaco.id === id) r.espaco.identificacao = atualizado.identificacao
    salvar()
    return copia(atualizado)
  },

  async alterarManutencao(id, emManutencao) {
    await atraso()
    exigirUsuario('ADMINISTRADOR')
    const espaco = buscar(id)
    espaco.emManutencao = emManutencao
    salvar()
    return copia(espaco)
  },

  async remover(id) {
    await atraso()
    exigirUsuario('ADMINISTRADOR')
    const espaco = buscar(id)
    const { espacos, reservas } = banco()
    if (reservas.some((r) => r.espaco.id === id))
      throw new ApiError(409, {
        mensagem: 'Espaço com reservas vinculadas.',
        codigo: 'ESPACO_COM_RESERVAS',
      })
    espacos.splice(espacos.indexOf(espaco), 1)
    salvar()
  },

  async contarReservasFuturas(id) {
    await atraso()
    buscar(id)
    const hoje = dataLocal()
    return banco().reservas.filter((r) => r.espaco.id === id && bloqueia(r) && r.dataFim >= hoje)
      .length
  },
}
