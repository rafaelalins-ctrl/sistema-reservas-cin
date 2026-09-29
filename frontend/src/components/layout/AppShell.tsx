import { Outlet } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
