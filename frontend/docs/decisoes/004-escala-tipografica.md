# 004 — Escala tipográfica

- **Lacuna:** o manual define famílias, pesos, entrelinha e tracking, mas não tamanhos.
- **Decisão:** escala 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64 px, mapeada nas classes do Tailwind:

| Classe      | Tamanho             | Entrelinha      |
| ----------- | ------------------- | --------------- |
| `text-xs`   | 12px                | 1.25 (notas)    |
| `text-sm`   | 14px                | 1.25            |
| `text-base` | 16px (corpo padrão) | 1.5             |
| `text-lg`   | 20px                | 1.5             |
| `text-xl`   | 24px                | 1.0 (subtítulo) |
| `text-2xl`  | 32px                | 0.95 (título)   |
| `text-3xl`  | 48px                | 0.95            |
| `text-4xl`  | 64px                | 0.95            |

- Tracking: `-0.02em` no corpo (no `body`) e `-0.05em` em `h1–h3` e `.display` (manual 2.5). Utilitários `tracking-title`, `tracking-body`, `leading-title`, `leading-subtitle`, `leading-body`, `leading-note`.
- **Atenção:** `text-lg`/`text-xl`/`text-2xl`… **não** têm os tamanhos padrão do Tailwind.
- **Onde:** `src/styles/index.css` (`@theme inline`).
