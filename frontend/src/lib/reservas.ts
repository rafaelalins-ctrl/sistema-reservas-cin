// Regras puras de horários e reservas (docs/prd.md, seção 3.2). Usadas pelos formulários e pelo
// simulado, para que os dois validem igual ao backend.
import { DIAS, DIAS_SEMANA } from '@/lib/api/rotulos'
import type { Conflito, DiaSemana, Horario, NovaReserva, Reserva } from '@/lib/api/tipos'

const MINUTOS_NO_DIA = 24 * 60

/** Data local de hoje em AAAA-MM-DD (não usa UTC, que vira o dia à noite). */
export function dataLocal(base = new Date()) {
  const ano = base.getFullYear()
  const mes = String(base.getMonth() + 1).padStart(2, '0')
  const dia = String(base.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** AAAA-MM-DD → Date ao meio-dia, para o fuso não virar o dia (convenção do backend). */
export function paraData(data: string) {
  return new Date(`${data}T12:00:00`)
}

export function somarDias(data: string, dias: number) {
  const d = paraData(data)
  d.setDate(d.getDate() + dias)
  return dataLocal(d)
}

export function diaDaSemana(data: string): DiaSemana {
  return DIAS_SEMANA[paraData(data).getDay()]
}

/** "08:30" → 510. Devolve NaN para texto inválido. */
export function minutos(hora: string) {
  const casamento = /^(\d{1,2}):(\d{2})$/.exec(hora)
  if (!casamento) return Number.NaN
  return Number(casamento[1]) * 60 + Number(casamento[2])
}

/** 510 → "08:30". */
export function horaFormatada(valor: number) {
  const h = String(Math.floor(valor / 60)).padStart(2, '0')
  const m = String(valor % 60).padStart(2, '0')
  return `${h}:${m}`
}

export function faixaFormatada({ inicioMin, fimMin }: { inicioMin: number; fimMin: number }) {
  return `${horaFormatada(inicioMin)}–${horaFormatada(fimMin)}`
}

/** "terça-feira 08:00–10:00" */
export function horarioFormatado(horario: Horario) {
  return `${DIAS[horario.dia]} ${faixaFormatada(horario)}`
}

/** "3 de outubro de 2026" (longa) ou "03/10/2026" (curta). */
export function dataFormatada(data: string, estilo: 'longa' | 'curta' = 'longa') {
  return paraData(data).toLocaleDateString('pt-BR', {
    dateStyle: estilo === 'longa' ? 'long' : 'short',
  })
}

/** "03/10" */
export function dataCurta(data: string) {
  return paraData(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function periodoFormatado(dataInicio: string, dataFim: string) {
  return dataInicio === dataFim
    ? dataFormatada(dataInicio)
    : `${dataFormatada(dataInicio)} a ${dataFormatada(dataFim)}`
}

/** Intervalos semiabertos [início, fim): encostados (10:00 e 10:00) não conflitam. */
export function intervalosConflitam(
  a: { inicioMin: number; fimMin: number },
  b: { inicioMin: number; fimMin: number },
) {
  return a.inicioMin < b.fimMin && b.inicioMin < a.fimMin
}

export function horarioValido({ inicioMin, fimMin }: { inicioMin: number; fimMin: number }) {
  return (
    Number.isInteger(inicioMin) &&
    Number.isInteger(fimMin) &&
    inicioMin >= 0 &&
    inicioMin < fimMin &&
    fimMin <= MINUTOS_NO_DIA
  )
}

/** Datas (AAAA-MM-DD) do período, inclusive as pontas. */
export function datasDoPeriodo(dataInicio: string, dataFim: string) {
  const datas: string[] = []
  for (let d = dataInicio; d <= dataFim; d = somarDias(d, 1)) datas.push(d)
  return datas
}

/** Cada data do período em que um dos horários semanais acontece. */
export function ocorrencias(dataInicio: string, dataFim: string, horarios: Horario[]): Conflito[] {
  if (dataFim < dataInicio) return []
  return datasDoPeriodo(dataInicio, dataFim).flatMap((data) => {
    const dia = diaDaSemana(data)
    return horarios
      .filter((h) => h.dia === dia)
      .map((h) => ({ data, inicioMin: h.inicioMin, fimMin: h.fimMin }))
  })
}

/** Índices dos horários que se sobrepõem a outro horário da mesma lista. */
export function horariosSobrepostos(horarios: Horario[]) {
  const indices = new Set<number>()
  horarios.forEach((a, i) =>
    horarios.forEach((b, j) => {
      if (i < j && a.dia === b.dia && intervalosConflitam(a, b)) {
        indices.add(i)
        indices.add(j)
      }
    }),
  )
  return indices
}

export type ErrosReserva = {
  dataInicio?: string
  dataFim?: string
  horarios?: string
  /** Mensagem por índice de horário. */
  porHorario: Record<number, string>
}

/** Validações do formulário de reserva, iguais às do backend (seção 3.2). */
export function validarReserva(
  nova: Pick<NovaReserva, 'dataInicio' | 'dataFim' | 'horarios'>,
  hoje = dataLocal(),
): ErrosReserva {
  const erros: ErrosReserva = { porHorario: {} }
  if (!nova.dataInicio) erros.dataInicio = 'Informe a data de início.'
  else if (nova.dataInicio < hoje) erros.dataInicio = 'A data de início não pode estar no passado.'
  if (!nova.dataFim) erros.dataFim = 'Informe a data de fim.'
  else if (nova.dataInicio && nova.dataFim < nova.dataInicio)
    erros.dataFim = 'A data de fim deve ser igual ou posterior à de início.'

  if (nova.horarios.length === 0) erros.horarios = 'Adicione pelo menos um horário.'

  const periodoOk = !erros.dataInicio && !erros.dataFim
  const diasNoPeriodo = periodoOk
    ? new Set(datasDoPeriodo(nova.dataInicio, nova.dataFim).slice(0, 7).map(diaDaSemana))
    : null
  const sobrepostos = horariosSobrepostos(nova.horarios)

  nova.horarios.forEach((h, i) => {
    if (!horarioValido(h)) erros.porHorario[i] = 'O horário de início deve ser anterior ao de fim.'
    else if (diasNoPeriodo && !diasNoPeriodo.has(h.dia))
      erros.porHorario[i] = `Não há ${DIAS[h.dia]} entre as datas escolhidas.`
    else if (sobrepostos.has(i)) erros.porHorario[i] = 'Este horário se sobrepõe a outro da lista.'
  })
  return erros
}

export function temErros(erros: ErrosReserva) {
  return Boolean(
    erros.dataInicio || erros.dataFim || erros.horarios || Object.keys(erros.porHorario).length > 0,
  )
}

/** Ignora acentos e maiúsculas: "laboratorio" encontra "Laboratório". */
export function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

/** P7: só reservas pendentes ou aprovadas que ainda não terminaram podem ser canceladas. */
export function podeCancelar(reserva: Reserva, hoje = dataLocal()) {
  return (reserva.status === 'PENDENTE' || reserva.status === 'APROVADA') && reserva.dataFim >= hoje
}
