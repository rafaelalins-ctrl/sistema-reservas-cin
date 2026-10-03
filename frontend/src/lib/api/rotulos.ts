// Enum da API → texto em pt-BR. A interface nunca mostra o valor cru (SALA_AULA, TERCA).
import type {
  Bloco,
  DiaSemana,
  Mobilia,
  StatusReserva,
  TipoEspaco,
  TipoQuadro,
  TipoUsuario,
} from '@/lib/api/tipos'

export const TIPOS_ESPACO: Record<TipoEspaco, string> = {
  SALA_AULA: 'Sala de aula',
  LABORATORIO: 'Laboratório',
  AUDITORIO: 'Auditório',
}

export const BLOCOS: Record<Bloco, string> = {
  BLOCO_A: 'Bloco A',
  BLOCO_B: 'Bloco B',
  BLOCO_C: 'Bloco C',
  BLOCO_D: 'Bloco D',
  BLOCO_E: 'Bloco E',
  AREA_2: 'Área 2',
}

export const MOBILIAS: Record<Mobilia, string> = {
  FIXA_ANFITEATRO: 'Fixa (anfiteatro)',
  CADEIRAS_MOVEIS: 'Cadeiras móveis',
  BANCADA_LAB: 'Bancada de laboratório',
}

export const QUADROS: Record<TipoQuadro, string> = {
  BRANCO: 'Quadro branco',
  VIDRO: 'Quadro de vidro',
}

export const STATUS_RESERVA: Record<StatusReserva, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
}

export const TIPOS_USUARIO: Record<TipoUsuario, string> = {
  PROFESSOR: 'Professor',
  ADMINISTRADOR: 'Administrador',
}

/** Na ordem de `Date.getDay()`: domingo = 0. */
export const DIAS_SEMANA: DiaSemana[] = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
]

/** Segunda a domingo, para listas e seletores. */
export const DIAS_UTEIS_PRIMEIRO: DiaSemana[] = [...DIAS_SEMANA.slice(1), 'DOMINGO']

export const DIAS: Record<DiaSemana, string> = {
  DOMINGO: 'domingo',
  SEGUNDA: 'segunda-feira',
  TERCA: 'terça-feira',
  QUARTA: 'quarta-feira',
  QUINTA: 'quinta-feira',
  SEXTA: 'sexta-feira',
  SABADO: 'sábado',
}

export const DIAS_CURTOS: Record<DiaSemana, string> = {
  DOMINGO: 'dom',
  SEGUNDA: 'seg',
  TERCA: 'ter',
  QUARTA: 'qua',
  QUINTA: 'qui',
  SEXTA: 'sex',
  SABADO: 'sáb',
}

/** Chaves de um mapa de rótulos, preservando a ordem de declaração. */
export function opcoes<K extends string>(mapa: Record<K, string>) {
  return (Object.keys(mapa) as K[]).map((valor) => ({ valor, rotulo: mapa[valor] }))
}
