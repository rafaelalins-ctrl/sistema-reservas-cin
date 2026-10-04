# Frontend — Sistema de Reservas CIn

React + Vite + TypeScript, com **Tailwind CSS v4** e **shadcn/ui**, personalizado com a identidade
visual do CIn-UFPE. A fonte de verdade da identidade é
[`docs/identidade-cin-ufpe.md`](docs/identidade-cin-ufpe.md).

> Estado atual: todas as telas do MVP do [PRD](../docs/prd.md) prontas e integradas à API HTTP do
> backend. Para detalhes da integração, veja
> [`docs/integracao-backend.md`](docs/integracao-backend.md). A página `/style-guide` (só em
> `npm run dev`) é a referência visual.

## Rodando

Requer Node 20.19+ (ou 22.12+).

```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_API_URL=/api; o Vite encaminha /api ao backend
npm run dev                  # http://localhost:5173 (API real em 127.0.0.1:18080)
```

Sem `VITE_API_SIMULADA`, o frontend usa o backend tanto em desenvolvimento quanto no build de
produção. Para testar sem iniciar o C++, defina `VITE_API_SIMULADA=todos`; nesse modo os dados ficam
no `sessionStorage` e a tela de login mostra as contas de demonstração.

| Script           | O que faz                                                                |
| ---------------- | ------------------------------------------------------------------------ |
| `npm run dev`    | servidor de desenvolvimento                                              |
| `npm run build`  | typecheck + build de produção                                            |
| `npm test`       | testes (Vitest) das regras de reserva e da API simulada                  |
| `npm run lint`   | oxlint + `check-design` + confere se `primitives.css` está em dia        |
| `npm run tokens` | regenera `src/styles/tokens/primitives.css` (rampa do vermelho e cinzas) |
| `npm run format` | Prettier (ordena classes do Tailwind)                                    |

## Telas

| Rota                            | Perfil        | O que faz                                            |
| ------------------------------- | ------------- | ---------------------------------------------------- |
| `/`                             | todos         | página inicial                                       |
| `/login`, `/cadastro`           | visitante     | entrar (perfil vem da API) e cadastro de professor   |
| `/app/minhas-reservas`          | professor     | reservas com filtros e cancelamento                  |
| `/app/disponibilidade`          | ambos         | espaços livres numa data/horário; professor solicita |
| `/app/reservas/nova`            | professor     | reserva com período e horários semanais              |
| `/app/espacos`                  | ambos         | catálogo com filtros na URL                          |
| `/app/espacos/:id`              | ambos         | detalhe, atributos por tipo e agenda semanal         |
| `/app/espacos/novo`, `…/editar` | administrador | cadastro e edição de espaço                          |
| `/app/solicitacoes`             | administrador | fila de pendentes: aprovar e rejeitar                |
| `/app/reservas`                 | administrador | todas as reservas, com filtros e paginação           |

## Estrutura

```
frontend/
  docs/                   identidade, decisões de design e integração com o backend
  scripts/
    generate-red-ramp.mjs gera os primitivos de cor (OKLCH, culori)
    check-design.mjs      guarda-corpos da identidade (roda no lint e no CI)
  src/
    styles/               Tailwind, fontes e tokens (primitives.css é GERADO)
    components/
      ui/                 componentes do shadcn (já adaptados)
      layout/             AppShell, Header, Footer, DashboardLayout, RequireAuth/Role
      estados/            carregando, vazio, erro, alerta, erro de campo
      formulario/         Campo (label + aria), SelectSimples
      reservas/           StatusBadge, ReservaItem
      espacos/            indicadores, atributos por tipo, agenda, ações do admin
      Confirmacao.tsx     diálogo de confirmação das ações de estado
    lib/
      api/                tipos do contrato, rótulos pt-BR, erros, cliente HTTP,
                          implementação real (real/) e simulada (simulado/)
      reservas.ts         regras puras: conflito [a,b), ocorrências, validação, datas
      AuthProvider.tsx    sessão; useRecurso, useFiltrosUrl
    pages/                uma pasta por área (espacos/) ou arquivo por tela
    router.tsx, main.tsx
```

**Regra principal:** as páginas importam só de `@/lib/api` e mostram erros com
`mensagemAmigavel(erro)`, nunca o texto cru do backend.

## Regras da identidade (resumo)

- **Cores:** fundo off-white `#F5F5F5`; vermelho `#CF2D3B` (`bg-primary`) é **acento**, nunca fundo
  dominante, e deve haver no máximo um botão primário por tela. Use sempre classes de tema
  (`bg-primary`, `text-muted-foreground`, `border-border`…), nunca HEX nem a paleta padrão do
  Tailwind.
- **Tokens em três camadas:** primitivos → aliases → componentes. Componentes não usam `--cin-*`.
- **Fontes:** Inter (opsz 18) só nos pesos **400 e 700** (`font-normal`/`font-bold`, com itálico
  para notas). DM Serif Display só em manchetes, com a classe `.display`.
- **Ícones:** Phosphor, **sempre Fill**, mínimo 16px. O padrão já vem do `IconContext` em
  `main.tsx`: `<MapPinIcon />` basta.
- **Estados:** nunca só pela cor; sempre ícone + texto. Veja `docs/decisoes/003-cores-de-estado.md`.
- **Só tema claro.**

## Adicionando componentes do shadcn

```bash
npx shadcn@latest add <componente>
```

O `components.json` já está com `iconLibrary: "phosphor"`. Depois de cada `add`:

1. Troque `font-medium`/`font-semibold` por `font-normal` ou `font-bold`.
2. Remova classes `dark:`.
3. Garanta ícones de no mínimo 16px (`size-4`).
4. Rode `npm run lint`: o `check-design` aponta o que faltar.
