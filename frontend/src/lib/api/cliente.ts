// Cliente HTTP da API real. Guarda a credencial da sessão (hoje HTTP Basic, P3) para que as
// páginas não precisem repassá-la a cada chamada. Trocar por um token Bearer mexe só aqui.
import { ApiError } from '@/lib/api/erros'
import type { CodigoErro, Credenciais, ErroApi } from '@/lib/api/tipos'

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

let autorizacao: string | null = null

export function definirCredenciais(credenciais: Credenciais | null) {
  autorizacao = credenciais ? basicAuth(credenciais) : null
}

export function basicAuth({ email, senha }: Credenciais) {
  const bytes = new TextEncoder().encode(`${email}:${senha}`)
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return `Basic ${btoa(binario)}`
}

type Opcoes = Omit<RequestInit, 'body'> & { corpo?: unknown; query?: Record<string, unknown> }

export async function request<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { corpo, query, ...init } = opcoes
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (corpo !== undefined) headers.set('Content-Type', 'application/json')
  if (autorizacao && !headers.has('Authorization')) headers.set('Authorization', autorizacao)

  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}${caminho}${montarQuery(query)}`, {
      ...init,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    throw new ApiError(0, { mensagem: 'Falha de rede.' })
  }

  if (!resposta.ok) throw new ApiError(resposta.status, await lerErro(resposta))
  if (resposta.status === 204) return undefined as T
  const texto = await resposta.text()
  return (texto ? JSON.parse(texto) : undefined) as T
}

function montarQuery(query?: Record<string, unknown>) {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor))
  }
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

// O contrato prevê erros em JSON (`ErroApi`). A API atual ainda responde texto puro em várias
// rotas: nesse caso guardamos o texto só para depuração; a tela usa mensagemAmigavel().
async function lerErro(resposta: Response): Promise<ErroApi> {
  const texto = await resposta.text().catch(() => '')
  try {
    const json = JSON.parse(texto) as Partial<ErroApi>
    return {
      mensagem: json.mensagem ?? texto,
      codigo: json.codigo as CodigoErro | undefined,
      campo: json.campo,
      detalhes: json.detalhes,
    }
  } catch {
    return { mensagem: texto }
  }
}
