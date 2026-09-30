# Errata do manual de identidade do CIn

Correções e interpretações aplicadas ao manual. Registramos aqui em vez de "consertar em silêncio".

## 1. Swatch `#858585` repetido na rampa de cinzas

O PDF repete `#858585` em mais de um swatch da rampa de cinzas. Consideramos válidos só
`#858585`, `#555555`, `#252525` e `#050505`. Os degraus intermediários
(`--cin-gray-100/200/300/500/700/900`) são **interpolados em OKLab** entre esses valores por
`scripts/generate-red-ramp.mjs`, sem valores inventados.

## 2. Tons Claro e Escuro do vermelho (HSB → HEX)

O manual define os tons em HSB. A conversão foi conferida:

| Tom    | HSB       | HEX       | Passo mais próximo da rampa                |
| ------ | --------- | --------- | ------------------------------------------ |
| Claro  | 355 78 91 | `#E83342` | `--cin-red-500` (`#E74C53`, ΔE2000 ≈ 3,9)  |
| Base   | 355 78 81 | `#CF2D3B` | `--cin-red-600` (exato, ancorado)          |
| Escuro | 355 78 71 | `#B52834` | `--cin-red-700` (`#B22431`, ΔE2000 ≈ 0,95) |

O tom Claro do manual é mais saturado que o passo 500 da rampa, que tem luminosidade
perceptualmente uniforme. A diferença é visível lado a lado, mas pequena. Se a equipe quiser o
valor exato do manual, dá para ancorar o 500 em `#E83342` no script.
