# 006 — Bordas e campos de formulário

- **Lacuna:** o manual sugere `#858585` para bordas, mas o guia observa que ele é forte demais para bordas comuns.
- **Decisão:**
  - `--border` (divisórias, cards) = `--cin-gray-200` (`#D2D2D2`), interpolado e suave.
  - `--input` (borda de campos) = `--cin-gray-400` (`#858585`, 3,38:1), porque controles de formulário precisam de 3:1 (WCAG 1.4.11).
  - `--ring` (foco) = vermelho base.
- `#858585` continua proibido para texto (3,38:1 não passa AA).
- **Onde:** `src/styles/tokens/aliases.css`.
