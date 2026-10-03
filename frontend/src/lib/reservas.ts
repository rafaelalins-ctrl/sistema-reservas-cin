export const DIAS = [
  { api: 'DOMINGO', nome: 'domingo' },
  { api: 'SEGUNDA', nome: 'segunda-feira' },
  { api: 'TERCA', nome: 'terça-feira' },
  { api: 'QUARTA', nome: 'quarta-feira' },
  { api: 'QUINTA', nome: 'quinta-feira' },
  { api: 'SEXTA', nome: 'sexta-feira' },
  { api: 'SABADO', nome: 'sábado' },
]

export function dataLocal() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

export function minutos(hora: string) {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

export function horaFormatada(valor: number) {
  return `${String(Math.floor(valor / 60)).padStart(2, '0')}:${String(valor % 60).padStart(2, '0')}`
}

export function dataFormatada(valor: string) {
  return new Date(`${valor}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'long' })
}

export function nomeTipo(tipo: string) {
  switch (tipo) {
    case 'SALA_AULA':
      return 'Sala de aula'
    case 'LABORATORIO':
      return 'Laboratório'
    case 'AUDITORIO':
      return 'Auditório'
    default:
      return tipo
  }
}
