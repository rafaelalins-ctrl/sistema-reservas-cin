import { describe, expect, it } from 'vitest'

import type { Horario } from '@/lib/api/tipos'
import {
  dataLocal,
  diaDaSemana,
  horaFormatada,
  horarioFormatado,
  horariosSobrepostos,
  intervalosConflitam,
  minutos,
  normalizarBusca,
  ocorrencias,
  somarDias,
  temErros,
  validarReserva,
} from '@/lib/reservas'

const h = (dia: Horario['dia'], inicio: string, fim: string): Horario => ({
  dia,
  inicioMin: minutos(inicio),
  fimMin: minutos(fim),
})

describe('horas', () => {
  it('converte entre HH:MM e minutos', () => {
    expect(minutos('08:30')).toBe(510)
    expect(horaFormatada(510)).toBe('08:30')
    expect(minutos('8h')).toBeNaN()
  })

  it('formata dia por extenso, com acento', () => {
    expect(horarioFormatado(h('TERCA', '08:00', '10:00'))).toBe('terça-feira 08:00–10:00')
  })
})

describe('datas', () => {
  it('calcula o dia da semana ao meio-dia, sem virar com o fuso', () => {
    expect(diaDaSemana('2026-10-06')).toBe('TERCA')
    expect(diaDaSemana('2026-10-04')).toBe('DOMINGO')
  })

  it('soma dias atravessando o mês', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('usa a data local', () => {
    expect(dataLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('conflito', () => {
  const a = { inicioMin: minutos('08:00'), fimMin: minutos('10:00') }

  it('intervalos encostados não conflitam ([a, b))', () => {
    expect(intervalosConflitam(a, { inicioMin: minutos('10:00'), fimMin: minutos('12:00') })).toBe(
      false,
    )
  })

  it('sobreposição parcial conflita', () => {
    expect(intervalosConflitam(a, { inicioMin: minutos('09:59'), fimMin: minutos('11:00') })).toBe(
      true,
    )
  })

  it('aponta horários sobrepostos no mesmo dia', () => {
    const lista = [
      h('TERCA', '08:00', '10:00'),
      h('TERCA', '09:00', '11:00'),
      h('QUINTA', '09:00', '11:00'),
    ]
    expect([...horariosSobrepostos(lista)]).toEqual([0, 1])
  })
})

describe('ocorrências', () => {
  it('conta cada data do período em que o horário cai', () => {
    // 05/10/2026 é segunda-feira; até 18/10 há duas terças e duas quintas.
    const lista = ocorrencias('2026-10-05', '2026-10-18', [
      h('TERCA', '08:00', '10:00'),
      h('QUINTA', '08:00', '10:00'),
    ])
    expect(lista.map((o) => o.data)).toEqual([
      '2026-10-06',
      '2026-10-08',
      '2026-10-13',
      '2026-10-15',
    ])
  })

  it('período invertido não tem ocorrências', () => {
    expect(ocorrencias('2026-10-10', '2026-10-01', [h('SEGUNDA', '08:00', '09:00')])).toEqual([])
  })
})

describe('validarReserva', () => {
  const hoje = '2026-10-01' // quinta-feira

  it('aceita uma reserva válida', () => {
    const erros = validarReserva(
      { dataInicio: hoje, dataFim: hoje, horarios: [h('QUINTA', '08:00', '10:00')] },
      hoje,
    )
    expect(temErros(erros)).toBe(false)
  })

  it('rejeita dia da semana que não ocorre no período', () => {
    const erros = validarReserva(
      { dataInicio: hoje, dataFim: hoje, horarios: [h('TERCA', '08:00', '10:00')] },
      hoje,
    )
    expect(erros.porHorario[0]).toMatch(/terça-feira/)
  })

  it('rejeita fim antes do início, lista vazia e data passada', () => {
    const erros = validarReserva(
      { dataInicio: '2026-09-30', dataFim: '2026-09-29', horarios: [] },
      hoje,
    )
    expect(erros.dataInicio).toBeDefined()
    expect(erros.horarios).toBeDefined()
  })

  it('rejeita início ≥ fim e sobreposição', () => {
    const erros = validarReserva(
      {
        dataInicio: hoje,
        dataFim: '2026-10-31',
        horarios: [
          h('SEGUNDA', '10:00', '10:00'),
          h('QUARTA', '08:00', '10:00'),
          h('QUARTA', '09:00', '11:00'),
        ],
      },
      hoje,
    )
    expect(erros.porHorario[0]).toMatch(/anterior/)
    expect(erros.porHorario[1]).toMatch(/sobrepõe/)
    expect(erros.porHorario[2]).toMatch(/sobrepõe/)
  })
})

it('normaliza busca sem acento e maiúsculas', () => {
  expect(normalizarBusca('Laboratório')).toBe('laboratorio')
})
