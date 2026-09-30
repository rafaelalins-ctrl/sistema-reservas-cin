# Identidade visual do CIn-UFPE — guia para o frontend

Este documento descreve a identidade visual do CIn (Centro de Informática, UFPE) e deve ser tratado como **fonte de verdade** para cores, tipografia e ícones no frontend. O projeto começa do zero: a pasta `frontend` está vazia e não existe código anterior a preservar. Toda decisão visual deve nascer daqui.

## Stack

- **React + Vite + TypeScript**
- **shadcn/ui** sobre **Tailwind CSS v4** (plugin `@tailwindcss/vite`, sem `tailwind.config.js`; tokens no CSS via `@theme`)
- Fontes via **Fontsource** (`@fontsource-variable/inter` e `@fontsource/dm-serif-display`)
- Ícones via **`@phosphor-icons/react`**

Se a versão do shadcn instalada pedir outra configuração de Tailwind, avisar antes de improvisar.

## Princípios

- **Simplicidade com personalidade.** Poucas escolhas, bem aplicadas e consistentes.
- **O off-white é a base.** Toda a interface "respira" sobre `#F5F5F5`. As cores de apoio aparecem com clareza e intenção sobre ele.
- **O vermelho é acento, nunca fundo dominante.** Aparece no logo, em destaques pontuais e em momentos institucionais.
- O sistema completo do CIn tem cinco sub-identidades (Administrativo, Docentes, Egressos, Parceiros, Alunos), cada uma com uma cor derivada da bandeira de Pernambuco. **Este projeto é de uso geral e usa somente a identidade institucional: a rampa do vermelho.** Não implementar nem referenciar as demais cores (bordô, verde, azul, amarelo).
- Apenas tema claro. O manual não define modo escuro; não criar um sem confirmar.

---

## 1. Cores

### 1.1 Cores oficiais

| Papel | Nome | HEX | RGB |
|---|---|---|---|
| Primária / fundo | Off-white | `#F5F5F5` | 245 245 245 |
| Acento institucional | Vermelho CIn | `#CF2D3B` | 207 45 59 |

O vermelho `#CF2D3B` é a adaptação do DNA histórico do CIn (presente no símbolo desde o início). É também a cor da área Administrativa: a mais institucional e mais próxima da marca-mãe.

### 1.2 Rampa do vermelho

O manual define três tons de referência para o vermelho, variando só o brilho (HSB) e mantendo matiz e saturação:

| Tom | HSB | HEX (aprox.) | Uso sugerido |
|---|---|---|---|
| Claro | 355 78 91 | `#E83342` | realces |
| **Base** | 355 78 81 | **`#CF2D3B`** | cor de marca |
| Escuro | 355 78 71 | `#B52834` | hover/pressed, texto vermelho sobre fundo claro |

Os HEX dos tons claro e escuro foram convertidos à mão a partir do HSB; conferir ao gerar a rampa.

Para uma interface completa, gerar uma escala de **11 passos (50, 100, 200 … 900, 950)** em **OKLCH**, com matiz aproximadamente constante e luminosidade perceptualmente uniforme. Regras:

- O `#CF2D3B` fica ancorado no passo em que ele naturalmente cai (perto de 600), **não forçado ao 500**.
- Os tons Claro e Escuro do manual devem cair próximos dos vizinhos da base; conferir depois de gerar.
- Fazer o mapeamento de gamut para sRGB (reduzir croma quando necessário).
- Exportar os valores finais em HEX (ou OKLCH), nunca em HSB. O manual usa HSB por ser o formato nativo das ferramentas de design, mas CSS não aceita HSB.
- Ferramenta sugerida: `culori` (JS) num script em `scripts/`.

Nomeação: `--cin-red-50` … `--cin-red-950`.

### 1.3 Neutros

O manual traz uma rampa de cinzas ao lado do off-white:

| HEX | Uso sugerido |
|---|---|
| `#F5F5F5` | fundo principal (off-white) |
| `#858585` | bordas, placeholders, elementos desabilitados (**não usar para texto**) |
| `#555555` | texto secundário |
| `#252525` | texto forte, superfícies escuras |
| `#050505` | texto principal, preto do sistema |

> **Atenção:** o PDF do manual repete `#858585` em mais de um swatch da rampa de cinzas (erro do documento). Considerar `#858585`, `#555555`, `#252525` e `#050505` como os valores válidos e, se precisar de mais degraus, interpolar entre eles em vez de inventar valores soltos. Registrar qualquer correção num arquivo de errata (`docs/errata.md`) em vez de "consertar" em silêncio.

### 1.4 Camadas de tokens

Organizar em três camadas: **primitivos** (valores brutos) → **aliases semânticos** → **tokens de componente**. Componentes nunca referenciam primitivos diretamente.

Estrutura sugerida:

```
src/styles/
  index.css            # imports do Tailwind, fontes e tokens; @theme inline
  tokens/
    primitives.css     # --cin-red-*, --cin-gray-*, --cin-offwhite
    aliases.css        # --background, --foreground, --primary, ...
```

### 1.5 Mapeamento para o shadcn/ui

O shadcn espera variáveis semânticas no `:root` e as expõe ao Tailwind com `@theme inline`. Mapeamento:

| Variável shadcn | Valor |
|---|---|
| `--background` | `#F5F5F5` |
| `--foreground` | `#050505` |
| `--card` | `#F5F5F5` (separar por borda, não por cor nova) ou branco puro só se for necessário; confirmar |
| `--card-foreground`, `--popover-foreground` | `#050505` |
| `--primary` | vermelho base `#CF2D3B` |
| `--primary-foreground` | `#F5F5F5` |
| `--secondary` | tom neutro derivado do off-white (interpolado entre `#F5F5F5` e `#858585`, bem suave) |
| `--secondary-foreground` | `#252525` |
| `--muted` | igual a `--secondary` |
| `--muted-foreground` | `#555555` |
| `--accent` | neutro suave (superfície de hover). **No shadcn, `accent` é uma superfície de hover, não a cor de marca; a marca é `--primary`.** |
| `--accent-foreground` | `#252525` |
| `--border`, `--input` | neutro claro derivado (`#858585` puro é forte demais para bordas comuns) |
| `--ring` | vermelho da rampa |
| `--radius` | decisão em aberto (manual não define); começar com `0.5rem` e registrar |
| `--destructive` | **decisão em aberto**, ver 1.6 |

Esqueleto (ajustar valores depois de gerar a rampa):

```css
@import "tailwindcss";

@import "./tokens/primitives.css";
@import "./tokens/aliases.css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  /* ...demais mapeamentos do shadcn... */

  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-display: "DM Serif Display", Georgia, serif;
}
```

### 1.6 Regras de uso e acessibilidade

- Vermelho nunca como fundo dominante de página ou de seções grandes. Usar em botões principais, links, indicadores, ícones e detalhes. Como `--primary` é vermelho, evitar mais de um botão primário por tela.
- Contraste verificado: `#CF2D3B` sobre `#F5F5F5` ≈ 4,7:1 e `#F5F5F5` sobre `#CF2D3B` ≈ 4,7:1, ambos passam AA para texto normal. `#858585` sobre `#F5F5F5` ≈ 3,4:1 **não passa** para texto.
- **Estados de erro, sucesso e aviso não existem no manual.** Como só o vermelho está disponível, há um conflito: marca e erro seriam a mesma cor. Decisão em aberto: usar um degrau bem mais escuro da rampa para `--destructive`, sempre acompanhado de ícone e texto (nunca só cor), e representar sucesso e aviso de forma neutra (ícone + texto) até a equipe decidir. Registrar em `docs/decisoes/`.

---

## 2. Tipografia

Duas famílias, ambas gratuitas no Google Fonts.

### 2.1 Inter — fonte primária (suporte)

- Presente em todas as áreas e níveis hierárquicos. É o padrão de tudo: interface, formulários, tabelas e corpo de texto.
- **"Inter 18pt" no manual é o valor do eixo óptico `opsz`, não um `font-size`.** Implementar com `font-optical-sizing: none` e `font-variation-settings: "opsz" 18`.
- Pesos em uso: **apenas Regular (400), Italic e Bold (700)**.
  - Regular: corpo de texto e descrições
  - Italic: notas, legendas e informações de suporte
  - Bold: títulos, subtítulos, ênfases e destaques
- **Os componentes do shadcn usam `font-medium` e `font-semibold` (500/600).** Depois de cada `npx shadcn add`, procurar essas classes e trocar por `font-normal` ou `font-bold`. Vale um teste ou script de lint que falhe se `font-medium` ou `font-semibold` aparecerem em `src/`.

Com Fontsource: `@fontsource-variable/inter` importando **`opsz.css`** e **`opsz-italic.css`** (não `index.css` nem `standard.css`, que não carregam o eixo `opsz`).

### 2.2 DM Serif Display — fonte secundária (destaque)

- Usada **exclusivamente** em títulos e chamadas principais, priorizando o **itálico**.
- Só peso **400** (regular e itálico). Não existe bold: travar `font-weight: 400` e `font-synthesis: none` para evitar negrito sintético.
- Com Fontsource: `@fontsource/dm-serif-display` (não variável), importando apenas `400.css` e `400-italic.css`.

### 2.3 Medidor de uso: quando usar cada uma

O manual define um "medidor" entre as duas fontes:

| Mais Inter | Mais DM Serif Display |
|---|---|
| Técnico | Notícia |
| Inovação | Humanização |
| Dia a dia | Relacionamento |

Na prática: **interface funcional, dashboards, formulários e telas operacionais → Inter para tudo.** DM Serif Display entra em manchetes, títulos de notícias, hero de páginas institucionais e chamadas de cunho humano.

### 2.4 Entrelinha (leading)

| Uso | Multiplicador |
|---|---|
| Títulos | 0.95 |
| Subtítulos | 1.0 |
| Corpo de texto | 1.5 (aceitável de 1.25 a 1.5) |
| Notas e informações menores | 1.25 |

### 2.5 Espaçamento entre letras (tracking)

| Uso | Valor |
|---|---|
| Títulos | -5% (`-0.05em`) |
| Subtítulos e corpo de texto | -2% (`-0.02em`) |

### 2.6 Escala tipográfica

O manual não define tamanhos em px. Adotar uma escala simples (ex.: 12, 14, 16, 20, 24, 32, 48, 64) e registrá-la nos tokens. Corpo de texto em 16px como padrão.

Base global (em `index.css`, dentro de `@layer base`):

```css
@layer base {
  body {
    font-family: var(--font-sans);
    font-optical-sizing: none;
    font-variation-settings: "opsz" 18;
    line-height: 1.5;
    letter-spacing: -0.02em;
    background: var(--background);
    color: var(--foreground);
  }

  h1, h2, h3 {
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  .display {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 400;
    font-synthesis: none;
  }
}
```

---

## 3. Ícones

- Biblioteca oficial: **Phosphor Icons** (phosphoricons.com), gratuita e open source. Pacote React: `@phosphor-icons/react`.
- Usar **exclusivamente o peso Fill**. Nunca Thin, Light, Regular, Bold nem Duotone. Isso dá mais peso visual e legibilidade em tamanhos pequenos.
- **Tamanho mínimo: 16px** em digital. Abaixo disso os detalhes se perdem.
- **Cor:** o ícone sempre segue a cor do contexto e nunca introduz uma cor nova.
  - Em fundo colorido: ícone off-white (`#F5F5F5`) ou preto.
  - Em fundo claro: ícone vermelho ou preto.
- **shadcn e ícones:** o `components.json` tem a opção `iconLibrary`. Verificar se a versão instalada aceita `phosphor`; se não aceitar, os componentes vêm com Lucide e precisam ter os imports trocados por Phosphor Fill (ex.: `Check`, `CaretDown`, `X`) depois de cada `shadcn add`. Não deixar Lucide nem outra biblioteca no projeto final.

Exemplo: `<Heart weight="fill" size={20} />` (o ícone herda `currentColor`).

---

## 4. Contexto visual (inspiração, sem implementação obrigatória)

O sistema nasce de Pernambuco. A bandeira do estado carrega cinco elementos simbólicos (sol, arco-íris, estrela, cruz e faixas de organização) que inspiram formas simples e carregadas de significado. O manual fornecido não especifica como esses elementos viram componentes gráficos, então **não inventar ilustrações ou padrões** com base neles sem confirmar com a equipe.

## 5. Checklist de setup

1. Criar o projeto com Vite (React + TypeScript), instalar Tailwind v4 e rodar `npx shadcn@latest init`.
2. Instalar as fontes via Fontsource com os arquivos exatos indicados (`opsz.css`, `opsz-italic.css`, `400.css`, `400-italic.css`).
3. Gerar a rampa do vermelho em OKLCH e escrever `primitives.css`; depois `aliases.css` com o mapeamento do shadcn.
4. Instalar `@phosphor-icons/react` e configurar os ícones dos componentes shadcn para Phosphor Fill (mín. 16px).
5. A cada `shadcn add`, trocar `font-medium`/`font-semibold` por 400/700 e ícones Lucide por Phosphor.
6. Aplicar leading e tracking conforme as tabelas acima.
7. Conferir contraste AA em todos os pares texto/fundo.
8. Anotar qualquer lacuna do manual (estados de erro/sucesso/aviso, escala de tamanhos, espaçamento, raios de borda, sombras, modo escuro) como decisão em aberto em vez de improvisar em silêncio.
