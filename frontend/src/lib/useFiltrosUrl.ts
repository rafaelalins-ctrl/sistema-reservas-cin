import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filtros guardados na URL (?tipo=&bloco=), para compartilhar o link e voltar com o navegador.
 * Valores vazios saem da URL.
 */
export function useFiltrosUrl<C extends string>(chaves: readonly C[]) {
  const [params, setParams] = useSearchParams()

  const filtros = Object.fromEntries(chaves.map((c) => [c, params.get(c) ?? ''])) as Record<
    C,
    string
  >

  const definir = useCallback(
    (alteracoes: Partial<Record<C, string | number | boolean | null | undefined>>) => {
      setParams(
        (atuais) => {
          const novos = new URLSearchParams(atuais)
          for (const [chave, valor] of Object.entries(alteracoes)) {
            if (valor === undefined || valor === null || valor === '' || valor === false)
              novos.delete(chave)
            else novos.set(chave, String(valor))
          }
          return novos
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const limpar = useCallback(
    () =>
      setParams(
        (atuais) => {
          const novos = new URLSearchParams(atuais)
          chaves.forEach((c) => novos.delete(c))
          return novos
        },
        { replace: true },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  )

  return { filtros, definir, limpar }
}
