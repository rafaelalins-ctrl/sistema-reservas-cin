import { beforeEach, describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api/erros'
import { encerrarSessao, iniciarSessao } from '@/lib/api/sessao'
import { apiSimulada as api, resetarSimulado } from '@/lib/api/simulado'
import { SENHA_TESTE } from '@/lib/api/simulado/dados'
import type { NovaReserva } from '@/lib/api/tipos'
import { dataLocal, diaDaSemana, somarDias } from '@/lib/reservas'

async function entrarComo(email: string) {
  const usuario = await api.auth.entrar({ email, senha: SENHA_TESTE })
  iniciarSessao(usuario, null)
  return usuario
}

const professora = () => entrarComo('ana.souza@cin.ufpe.br')
const admin = () => entrarComo('admin@cin.ufpe.br')

async function falha(promessa: Promise<unknown>) {
  try {
    await promessa
  } catch (erro) {
    if (erro instanceof ApiError) return erro
    throw erro
  }
  throw new Error('Era esperado um erro da API.')
}

function avulsa(idEspaco: number, dias: number, inicio: number, fim: number): NovaReserva {
  const data = somarDias(dataLocal(), dias)
  return {
    idEspaco,
    dataInicio: data,
    dataFim: data,
    horarios: [{ dia: diaDaSemana(data), inicioMin: inicio * 60, fimMin: fim * 60 }],
  }
}

beforeEach(() => {
  resetarSimulado()
  encerrarSessao()
})

describe('autenticação', () => {
  it('recusa senha errada com 401', async () => {
    const erro = await falha(api.auth.entrar({ email: 'admin@cin.ufpe.br', senha: 'errada' }))
    expect(erro.status).toBe(401)
    expect(erro.codigo).toBe('CREDENCIAIS_INVALIDAS')
  })

  it('normaliza o e-mail e recusa cadastro repetido', async () => {
    const erro = await falha(
      api.auth.cadastrar({
        nome: 'Ana',
        email: '  ANA.SOUZA@cin.ufpe.br ',
        senha: '12345678',
        departamento: 'CC',
      }),
    )
    expect(erro.status).toBe(409)
    expect(erro.campo).toBe('email')
  })

  it('exige senha com pelo menos 8 caracteres', async () => {
    const erro = await falha(
      api.auth.cadastrar({ nome: 'X', email: 'x@cin.ufpe.br', senha: '123', departamento: 'CC' }),
    )
    expect(erro.status).toBe(400)
    expect(erro.campo).toBe('senha')
  })
})

describe('reservas', () => {
  it('cria pendente e bloqueia o horário para outro pedido', async () => {
    await professora()
    const reserva = await api.reservas.criar(avulsa(3, 1, 14, 16))
    expect(reserva.status).toBe('PENDENTE')
    const erro = await falha(api.reservas.criar(avulsa(3, 1, 15, 17)))
    expect(erro.status).toBe(409)
    expect(erro.codigo).toBe('CONFLITO_HORARIO')
    expect(erro.detalhes?.conflitos).toHaveLength(1)
  })

  it('aceita horário encostado', async () => {
    await professora()
    await api.reservas.criar(avulsa(3, 1, 14, 16))
    await expect(api.reservas.criar(avulsa(3, 1, 16, 18))).resolves.toBeTruthy()
  })

  it('libera o horário quando a reserva é cancelada', async () => {
    await professora()
    const reserva = await api.reservas.criar(avulsa(3, 1, 14, 16))
    await api.reservas.cancelar(reserva.id)
    await expect(api.reservas.criar(avulsa(3, 1, 14, 16))).resolves.toBeTruthy()
  })

  it('recusa espaço em manutenção', async () => {
    await professora()
    const erro = await falha(api.reservas.criar(avulsa(5, 1, 8, 9)))
    expect(erro.codigo).toBe('ESPACO_EM_MANUTENCAO')
  })

  it('só o administrador decide, e só pendentes', async () => {
    await professora()
    const reserva = await api.reservas.criar(avulsa(3, 2, 8, 9))
    expect((await falha(api.reservas.aprovar(reserva.id))).status).toBe(403)

    await admin()
    await api.reservas.aprovar(reserva.id)
    const erro = await falha(api.reservas.rejeitar(reserva.id))
    expect(erro.status).toBe(409)
    expect(erro.codigo).toBe('STATUS_INVALIDO')
  })

  it('pendentes vêm das mais antigas para as mais novas', async () => {
    await admin()
    const pendentes = await api.reservas.pendentes()
    const datas = pendentes.map((r) => r.criadaEm ?? '')
    expect(datas).toEqual([...datas].sort())
  })

  it('exige sessão', async () => {
    expect((await falha(api.reservas.minhas())).status).toBe(401)
  })
})

describe('espaços', () => {
  it('disponibilidade ignora manutenção e horários ocupados', async () => {
    await professora()
    const filtros = {
      data: somarDias(dataLocal(), 1),
      inicioMin: 14 * 60,
      fimMin: 16 * 60,
    }
    const antes = await api.espacos.disponiveis(filtros)
    expect(antes.some((e) => e.id === 5)).toBe(false)
    expect(antes.some((e) => e.id === 3)).toBe(true)

    await api.reservas.criar(avulsa(3, 1, 14, 16))
    const depois = await api.espacos.disponiveis(filtros)
    expect(depois.some((e) => e.id === 3)).toBe(false)
  })

  it('agenda mostra o professor só para o administrador', async () => {
    const de = dataLocal()
    const ate = somarDias(de, 30)
    await professora()
    const paraProfessor = await api.espacos.agenda(1, { de, ate })
    expect(paraProfessor.ocupacoes.length).toBeGreaterThan(0)
    expect(paraProfessor.ocupacoes.every((o) => !o.professor)).toBe(true)

    await admin()
    const paraAdmin = await api.espacos.agenda(1, { de, ate })
    expect(paraAdmin.ocupacoes.every((o) => o.professor)).toBe(true)
  })

  it('gestão: identificação única, tipo imutável e remoção bloqueada com reservas', async () => {
    await admin()
    const erro = await falha(
      api.espacos.criar({
        tipo: 'SALA_AULA',
        identificacao: 'a001',
        capacidade: 10,
        bloco: 'BLOCO_A',
        mobilia: 'CADEIRAS_MOVEIS',
        qtdTomadas: 0,
        acessivelCadeirante: false,
        requerRetiradaChave: false,
        emManutencao: false,
        tipoQuadro: 'BRANCO',
        possuiProjetor: false,
      }),
    )
    expect(erro.codigo).toBe('IDENTIFICACAO_DUPLICADA')

    const lab = await api.espacos.obter(6)
    const { id: _id, ...entrada } = lab
    const tipoTrocado = await falha(
      api.espacos.atualizar(6, {
        ...entrada,
        tipo: 'AUDITORIO',
        equipamentoSom: true,
        cabineTraducao: false,
      }),
    )
    expect(tipoTrocado.campo).toBe('tipo')

    expect((await falha(api.espacos.remover(1))).codigo).toBe('ESPACO_COM_RESERVAS')
  })

  it('conta reservas futuras para o aviso de manutenção', async () => {
    expect(await api.espacos.contarReservasFuturas(5)).toBe(1)
  })
})
