import { createContext, useContext } from 'react'

/** Contador de solicitações pendentes exibido na aba do administrador (F14, item 6). */
export type ContagemPendentes = {
  total: number | null
  definir: (total: number) => void
  atualizar: () => void
}

export const PendentesContext = createContext<ContagemPendentes>({
  total: null,
  definir: () => {},
  atualizar: () => {},
})

export function usePendentes() {
  return useContext(PendentesContext)
}
