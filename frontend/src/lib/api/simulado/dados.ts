// Carga inicial do simulado. As datas são relativas a hoje, para a demonstração nunca envelhecer.
// Contas de teste: ver contas.ts.
import type { DiaSemana, Espaco, Horario, Reserva, Usuario } from '@/lib/api/tipos'
import { SENHA_TESTE } from '@/lib/api/simulado/contas'
import { dataLocal, diaDaSemana, somarDias } from '@/lib/reservas'

export type UsuarioSimulado = Usuario & { senha: string }

function usuarios(): UsuarioSimulado[] {
  return [
    {
      id: 1,
      nome: 'Ana Souza',
      email: 'ana.souza@cin.ufpe.br',
      tipo: 'PROFESSOR',
      departamento: 'Ciência da Computação',
      senha: SENHA_TESTE,
    },
    {
      id: 2,
      nome: 'Bruno Lima',
      email: 'bruno.lima@cin.ufpe.br',
      tipo: 'PROFESSOR',
      departamento: 'Engenharia da Computação',
      senha: SENHA_TESTE,
    },
    {
      id: 3,
      nome: 'Carla Mendes',
      email: 'admin@cin.ufpe.br',
      tipo: 'ADMINISTRADOR',
      senha: SENHA_TESTE,
    },
  ]
}

function espacos(): Espaco[] {
  const base = { requerRetiradaChave: false, emManutencao: false }
  return [
    {
      ...base,
      id: 1,
      tipo: 'SALA_AULA',
      identificacao: 'A001',
      capacidade: 40,
      bloco: 'BLOCO_A',
      mobilia: 'CADEIRAS_MOVEIS',
      qtdTomadas: 10,
      acessivelCadeirante: true,
      tipoQuadro: 'BRANCO',
      possuiProjetor: true,
    },
    {
      ...base,
      id: 2,
      tipo: 'SALA_AULA',
      identificacao: 'A002',
      capacidade: 60,
      bloco: 'BLOCO_A',
      mobilia: 'FIXA_ANFITEATRO',
      qtdTomadas: 8,
      acessivelCadeirante: true,
      tipoQuadro: 'VIDRO',
      possuiProjetor: true,
    },
    {
      ...base,
      id: 3,
      tipo: 'SALA_AULA',
      identificacao: 'A003',
      capacidade: 30,
      bloco: 'BLOCO_A',
      mobilia: 'CADEIRAS_MOVEIS',
      qtdTomadas: 6,
      acessivelCadeirante: false,
      tipoQuadro: 'BRANCO',
      possuiProjetor: false,
    },
    {
      ...base,
      id: 4,
      tipo: 'SALA_AULA',
      identificacao: 'B101',
      capacidade: 45,
      bloco: 'BLOCO_B',
      mobilia: 'CADEIRAS_MOVEIS',
      qtdTomadas: 12,
      acessivelCadeirante: true,
      requerRetiradaChave: true,
      tipoQuadro: 'VIDRO',
      possuiProjetor: true,
    },
    {
      ...base,
      id: 5,
      tipo: 'SALA_AULA',
      identificacao: 'C012',
      capacidade: 25,
      bloco: 'BLOCO_C',
      mobilia: 'CADEIRAS_MOVEIS',
      qtdTomadas: 4,
      acessivelCadeirante: false,
      emManutencao: true,
      tipoQuadro: 'BRANCO',
      possuiProjetor: false,
    },
    {
      ...base,
      id: 6,
      tipo: 'LABORATORIO',
      identificacao: 'LAB-G1',
      capacidade: 40,
      bloco: 'BLOCO_D',
      mobilia: 'BANCADA_LAB',
      qtdTomadas: 45,
      acessivelCadeirante: true,
      requerRetiradaChave: true,
      qtdComputadores: 40,
      softwaresInstalados: ['VS Code', 'Python 3', 'Java (JDK 21)', 'MySQL'],
    },
    {
      ...base,
      id: 7,
      tipo: 'LABORATORIO',
      identificacao: 'LAB-G2',
      capacidade: 30,
      bloco: 'BLOCO_D',
      mobilia: 'BANCADA_LAB',
      qtdTomadas: 35,
      acessivelCadeirante: true,
      requerRetiradaChave: true,
      qtdComputadores: 30,
      softwaresInstalados: ['MATLAB', 'GNU Octave', 'Python 3'],
    },
    {
      ...base,
      id: 8,
      tipo: 'LABORATORIO',
      identificacao: 'LAB-G3',
      capacidade: 20,
      bloco: 'BLOCO_E',
      mobilia: 'BANCADA_LAB',
      qtdTomadas: 25,
      acessivelCadeirante: false,
      requerRetiradaChave: true,
      qtdComputadores: 20,
      softwaresInstalados: [],
    },
    {
      ...base,
      id: 9,
      tipo: 'LABORATORIO',
      identificacao: 'LAB-HW',
      capacidade: 16,
      bloco: 'BLOCO_E',
      mobilia: 'BANCADA_LAB',
      qtdTomadas: 32,
      acessivelCadeirante: true,
      requerRetiradaChave: true,
      qtdComputadores: 16,
      softwaresInstalados: ['Quartus Prime', 'ModelSim', 'Arduino IDE'],
    },
    {
      ...base,
      id: 10,
      tipo: 'AUDITORIO',
      identificacao: 'AUD-A',
      capacidade: 150,
      bloco: 'BLOCO_A',
      mobilia: 'FIXA_ANFITEATRO',
      qtdTomadas: 20,
      acessivelCadeirante: true,
      requerRetiradaChave: true,
      equipamentoSom: true,
      cabineTraducao: false,
    },
    {
      ...base,
      id: 11,
      tipo: 'AUDITORIO',
      identificacao: 'AUD-E',
      capacidade: 220,
      bloco: 'BLOCO_E',
      mobilia: 'FIXA_ANFITEATRO',
      qtdTomadas: 30,
      acessivelCadeirante: true,
      requerRetiradaChave: true,
      equipamentoSom: true,
      cabineTraducao: true,
    },
    {
      ...base,
      id: 12,
      tipo: 'SALA_AULA',
      identificacao: 'E201',
      capacidade: 50,
      bloco: 'AREA_2',
      mobilia: 'CADEIRAS_MOVEIS',
      qtdTomadas: 10,
      acessivelCadeirante: true,
      tipoQuadro: 'BRANCO',
      possuiProjetor: true,
    },
  ]
}

const h = (dia: DiaSemana, inicio: number, fim: number): Horario => ({
  dia,
  inicioMin: inicio * 60,
  fimMin: fim * 60,
})

function reservas(espacosSemente: Espaco[], usuariosSemente: UsuarioSimulado[]): Reserva[] {
  const hoje = dataLocal()
  const d = (dias: number) => somarDias(hoje, dias)
  const avulsa = (dias: number, inicio: number, fim: number) => ({
    dataInicio: d(dias),
    dataFim: d(dias),
    horarios: [h(diaDaSemana(d(dias)), inicio, fim)],
  })
  const espaco = (id: number) => {
    const e = espacosSemente.find((x) => x.id === id)!
    return { id: e.id, identificacao: e.identificacao, tipo: e.tipo }
  }
  const professor = (id: number) => {
    const u = usuariosSemente.find((x) => x.id === id)!
    return { id: u.id, nome: u.nome, email: u.email }
  }
  const criadaEm = (diasAtras: number, hora = 9) => {
    const data = new Date(`${d(-diasAtras)}T${String(hora).padStart(2, '0')}:00:00`)
    return data.toISOString()
  }

  const lista: Omit<Reserva, 'id'>[] = [
    {
      ...avulsa(2, 8, 10),
      status: 'APROVADA',
      espaco: espaco(1),
      professor: professor(1),
      criadaEm: criadaEm(6),
    },
    {
      dataInicio: d(1),
      dataFim: d(60),
      horarios: [h('TERCA', 10, 12), h('QUINTA', 10, 12)],
      status: 'PENDENTE',
      espaco: espaco(6),
      professor: professor(1),
      criadaEm: criadaEm(3, 10),
    },
    {
      ...avulsa(5, 14, 17),
      status: 'PENDENTE',
      espaco: espaco(10),
      professor: professor(1),
      criadaEm: criadaEm(1, 15),
    },
    {
      ...avulsa(-10, 8, 10),
      status: 'APROVADA',
      espaco: espaco(3),
      professor: professor(1),
      criadaEm: criadaEm(15),
    },
    {
      ...avulsa(-3, 13, 15),
      status: 'REJEITADA',
      espaco: espaco(11),
      professor: professor(1),
      criadaEm: criadaEm(8),
      motivo: 'Auditório reservado para a semana de calouros.',
    },
    {
      ...avulsa(7, 16, 18),
      status: 'CANCELADA',
      espaco: espaco(4),
      professor: professor(1),
      criadaEm: criadaEm(4),
    },
    {
      dataInicio: d(1),
      dataFim: d(90),
      horarios: [h('SEGUNDA', 8, 10), h('QUARTA', 8, 10)],
      status: 'APROVADA',
      espaco: espaco(2),
      professor: professor(2),
      criadaEm: criadaEm(12),
    },
    {
      // Encosta na reserva das 08:00–10:00 da A001: intervalos [a, b) não conflitam.
      ...avulsa(2, 10, 12),
      status: 'PENDENTE',
      espaco: espaco(1),
      professor: professor(2),
      criadaEm: criadaEm(2, 11),
    },
    {
      ...avulsa(3, 13, 15),
      status: 'PENDENTE',
      espaco: espaco(7),
      professor: professor(2),
      criadaEm: criadaEm(2, 14),
    },
    {
      ...avulsa(-20, 10, 12),
      status: 'APROVADA',
      espaco: espaco(9),
      professor: professor(2),
      criadaEm: criadaEm(25),
    },
    {
      ...avulsa(4, 18, 20),
      status: 'REJEITADA',
      espaco: espaco(12),
      professor: professor(2),
      criadaEm: criadaEm(5),
    },
    {
      ...avulsa(14, 9, 12),
      status: 'APROVADA',
      espaco: espaco(11),
      professor: professor(2),
      criadaEm: criadaEm(9),
    },
    {
      // Aprovada antes de a C012 entrar em manutenção (P5: continua válida).
      ...avulsa(6, 10, 12),
      status: 'APROVADA',
      espaco: espaco(5),
      professor: professor(2),
      criadaEm: criadaEm(20),
    },
  ]
  return lista.map((reserva, i) => ({ id: i + 1, ...reserva }))
}

export function semente() {
  const u = usuarios()
  const e = espacos()
  return { usuarios: u, espacos: e, reservas: reservas(e, u) }
}
