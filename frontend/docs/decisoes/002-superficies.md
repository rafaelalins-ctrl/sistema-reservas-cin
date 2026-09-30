# 002 — Superfícies (card e popover)

- **Lacuna:** o manual diz que tudo "respira" sobre o off-white `#F5F5F5`, mas não define superfícies elevadas.
- **Decisão:** `--card` e `--popover` usam o mesmo off-white do fundo e se separam por **borda/anel** (e sombra, no caso de sobreposições), sem introduzir branco puro ou outra cor.
- **Revisitar se:** alguma tela precisar de mais separação visual; a alternativa é branco `#FFFFFF` só para cards.
- **Onde:** `src/styles/tokens/aliases.css`.
