import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

/**
 * Carrega dados de uma função assíncrona e expõe os estados padrão das telas (PRD, seção 4).
 * Ignora respostas que chegam depois de o componente sair ou de as dependências mudarem.
 */
export function useRecurso<T>(carregar: () => Promise<T>, deps: DependencyList) {
  const [dados, setDados] = useState<T | undefined>(undefined)
  const [erro, setErro] = useState<unknown>(null)
  const [carregando, setCarregando] = useState(true)
  const versao = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(carregar, deps)

  const recarregar = useCallback(async () => {
    const atual = ++versao.current
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await executar()
      if (atual === versao.current) setDados(resultado)
    } catch (e) {
      if (atual === versao.current) setErro(e)
    } finally {
      if (atual === versao.current) setCarregando(false)
    }
  }, [executar])

  useEffect(() => {
    void recarregar()
    return () => {
      // Invalida respostas pendentes: incrementar aqui é intencional, não um nó do DOM.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      versao.current++
    }
  }, [recarregar])

  return { dados, setDados, erro, carregando, recarregar }
}
