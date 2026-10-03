import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { BLOCOS, MOBILIAS, QUADROS, TIPOS_ESPACO, type Espaco } from '@/lib/api'

/** Booleano como ícone + "Sim/Não" (F07, item 1). */
export function SimNao({ valor }: { valor: boolean }) {
  return valor ? (
    <span className="inline-flex items-center gap-1.5">
      <CheckCircleIcon className="text-foreground" /> Sim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <XCircleIcon /> Não
    </span>
  )
}

function Lista({ titulo, itens }: { titulo: string; itens: [string, ReactNode][] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-bold">{titulo}</h3>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {itens.map(([termo, valor]) => (
          <div key={termo} className="flex flex-col gap-0.5 border-b border-border pb-2">
            <dt className="text-sm text-muted-foreground">{termo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function AtributosComuns({ espaco }: { espaco: Espaco }) {
  return (
    <Lista
      titulo="Características"
      itens={[
        ['Tipo', TIPOS_ESPACO[espaco.tipo]],
        ['Capacidade', `Até ${espaco.capacidade} pessoas`],
        ['Localização', BLOCOS[espaco.bloco]],
        ['Mobília', MOBILIAS[espaco.mobilia]],
        ['Tomadas', espaco.qtdTomadas === 1 ? '1 tomada' : `${espaco.qtdTomadas} tomadas`],
        ['Acessível para cadeirantes', <SimNao key="a" valor={espaco.acessivelCadeirante} />],
        ['Requer retirada de chave', <SimNao key="c" valor={espaco.requerRetiradaChave} />],
      ]}
    />
  )
}

/** Seção específica do tipo (PRD, seção 3.1). */
export function AtributosPorTipo({ espaco }: { espaco: Espaco }) {
  switch (espaco.tipo) {
    case 'SALA_AULA':
      return (
        <Lista
          titulo="Sala de aula"
          itens={[
            ['Quadro', QUADROS[espaco.tipoQuadro]],
            ['Projetor', <SimNao key="p" valor={espaco.possuiProjetor} />],
          ]}
        />
      )
    case 'LABORATORIO':
      return (
        <section className="flex flex-col gap-3">
          <Lista titulo="Laboratório" itens={[['Computadores', String(espaco.qtdComputadores)]]} />
          <div className="flex flex-col gap-2">
            <h4 className="text-sm text-muted-foreground">Softwares instalados</h4>
            {espaco.softwaresInstalados.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum software informado</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {espaco.softwaresInstalados.map((software) => (
                  <li
                    key={software}
                    className="rounded-4xl border border-border px-2.5 py-0.5 text-sm"
                  >
                    {software}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )
    case 'AUDITORIO':
      return (
        <Lista
          titulo="Auditório"
          itens={[
            ['Equipamento de som', <SimNao key="s" valor={espaco.equipamentoSom} />],
            ['Cabine de tradução', <SimNao key="t" valor={espaco.cabineTraducao} />],
          ]}
        />
      )
  }
}
