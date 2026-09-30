# Frontend — Sistema de Reservas CIn

React + Vite + TypeScript, com **Tailwind CSS v4** e **shadcn/ui**, personalizado com a identidade
visual do CIn-UFPE. A fonte de verdade da identidade é
[`docs/identidade-cin-ufpe.md`](docs/identidade-cin-ufpe.md).

> Estado atual: projeto inicializado e com a identidade aplicada. As telas do sistema ainda não
> existem. A página `/style-guide` é a referência para construí-las.

## Rodando

Requer Node 20.19+ (ou 22.12+).

```bash
cd frontend
npm install
cp .env.example .env.local   # URL da API do backend
npm run dev                  # http://localhost:5173
```

| Script           | O que faz                                                                |
| ---------------- | ------------------------------------------------------------------------ |
| `npm run dev`    | servidor de desenvolvimento                                              |
| `npm run build`  | typecheck + build de produção                                            |
| `npm run lint`   | oxlint + `check-design` + confere se `primitives.css` está em dia        |
| `npm run tokens` | regenera `src/styles/tokens/primitives.css` (rampa do vermelho e cinzas) |
| `npm run format` | Prettier (ordena classes do Tailwind)                                    |

## Estrutura

```
frontend/
  docs/                   identidade do CIn, errata e decisões de design
  scripts/
    generate-red-ramp.mjs gera os primitivos de cor (OKLCH, culori)
    check-design.mjs      guarda-corpos da identidade (roda no lint e no CI)
  src/
    styles/
      index.css           Tailwind, fontes, @theme inline e base tipográfica
      tokens/
        primitives.css    --cin-offwhite, --cin-red-*, --cin-gray-* (GERADO)
        aliases.css       variáveis do shadcn (--primary, --border...)
    components/
      ui/                 componentes do shadcn (já adaptados)
      layout/             AppShell, Header, Footer
    lib/                  utils (cn), contraste
    pages/                Home, StyleGuide, NotFound
    router.tsx, main.tsx
```

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
