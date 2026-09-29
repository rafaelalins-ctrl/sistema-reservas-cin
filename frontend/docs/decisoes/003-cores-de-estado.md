# 003 — Cores de estado (erro, sucesso, aviso)

- **Lacuna:** o manual não define cores de estado, e o projeto usa **somente** a rampa do vermelho (sem as cores das sub-identidades). Marca e erro seriam a mesma cor.
- **Decisão:**
  - **Erro** (`--destructive`) = `--cin-red-800` (`#912129`, 7,85:1 sobre off-white): mais escuro que a marca e **sempre** acompanhado de ícone (`WarningCircle`) e texto.
  - **Sucesso e aviso** = neutros (texto e ícone em preto/cinza). O significado vem do **ícone + texto** (`CheckCircle`, `Warning`), nunca só da cor.
  - Badges de status seguem a mesma regra: `Pendente` (outline + `Clock`), `Aprovada` (secondary + `CheckCircle`), `Rejeitada` (destructive + `WarningCircle`).
- **Validar com a equipe** antes das telas de reserva.
- **Onde:** `src/styles/tokens/aliases.css`; exemplos em `/style-guide`.
