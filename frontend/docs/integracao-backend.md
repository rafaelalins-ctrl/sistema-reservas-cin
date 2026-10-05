# Integração com o backend

O frontend está pronto para a API descrita na seção 5 do [PRD](../../docs/prd.md). Enquanto o
backend não chega lá, cada recurso pode usar uma **implementação simulada** com as mesmas regras
de negócio. Integrar é trocar a implementação de um recurso, sem mexer nas páginas.

## Como a camada funciona

```
páginas ──▶ @/lib/api (index.ts) ──┬──▶ real/      fetch + adaptadores ──▶ backend (/api)
                                   └──▶ simulado/  em memória (sessionStorage), mesmas regras
```

- `lib/api/tipos.ts` — tipos do contrato e a interface `Api` (`auth`, `espacos`, `reservas`).
  Real e simulado implementam exatamente essa interface.
- `lib/api/index.ts` — escolhe a implementação **por recurso** e trata o `401` global (encerra a
  sessão e leva ao login com "Sua sessão expirou").
- `lib/api/cliente.ts` — `request()`: base `VITE_API_URL`, cabeçalho `Authorization`, erros em JSON
  (`{ mensagem, codigo, campo, detalhes }`) ou texto puro.
- `lib/api/erros.ts` — `ApiError` e `mensagemAmigavel()`, que traduz `codigo`/`status` para pt-BR.
- `lib/api/sessao.ts` — credencial da sessão (hoje HTTP Basic) e usuário atual.

## Escolhendo real ou simulado

Variável `VITE_API_SIMULADA` (em `.env.local`):

| Valor                          | Efeito                                          |
| ------------------------------ | ----------------------------------------------- |
| _(ausente)_                    | tudo real em desenvolvimento e produção         |
| `todos`                        | tudo simulado                                   |
| `espacos,reservas`             | autenticação real, espaços e reservas simulados |
| `espacos`                      | só espaços simulados                            |
| _(vazio)_ `VITE_API_SIMULADA=` | tudo real                                       |

Com a autenticação simulada, a sessão sobrevive ao recarregar (fica no `sessionStorage`). Com a
real, a senha do HTTP Basic fica só em memória e recarregar a página pede login de novo (P3).

O simulado é um chunk separado, carregado sob demanda: quem usa só a API real não o baixa.

## Mapa das rotas

| Função em `api`                     | Rota esperada                                                                                   | Situação atual                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `auth.cadastrar(dados)`             | `POST /auth/register`                                                                           | implementado                                             |
| `auth.entrar(credenciais)`          | `POST /auth/login` (Basic)                                                                      | implementado; retorna `id` e departamento                |
| `espacos.listar(filtros)`           | `GET /espacos?tipo=&bloco=&capacidadeMin=&acessivel=`                                           | implementado; retorna atributos completos                |
| `espacos.obter(id)`                 | `GET /espacos/:id`                                                                              | implementado                                             |
| `espacos.disponiveis(filtros)`      | `GET /espacos/disponiveis?data=&inicio=&fim=&capacidadeMin=&tipo=&acessivel=`                   | implementado; aceita também `dia` e `capacidade` legados |
| `espacos.agenda(id, { de, ate })`   | `GET /espacos/:id/agenda?de=&ate=`                                                              | implementado; nomes de professores só para admin         |
| `espacos.criar(entrada)`            | `POST /espacos`                                                                                 | implementado (admin)                                     |
| `espacos.atualizar(id, entrada)`    | `PUT /espacos/:id`                                                                              | implementado (admin)                                     |
| `espacos.alterarManutencao(id, v)`  | `PATCH /espacos/:id` `{ emManutencao }`                                                         | implementado (admin)                                     |
| `espacos.remover(id)`               | `DELETE /espacos/:id`                                                                           | implementado (admin; bloqueia espaços com reservas)      |
| `espacos.contarReservasFuturas(id)` | `GET /espacos/:id/reservas-futuras` → `{ total }`                                               | implementado (admin)                                     |
| `reservas.criar(nova)`              | `POST /reservas`                                                                                | implementado; retorna `Reserva` completa                 |
| `reservas.minhas()`                 | `GET /reservas/minhas`                                                                          | implementado; resposta estruturada                       |
| `reservas.pendentes()`              | `GET /reservas/pendentes`                                                                       | implementado (admin)                                     |
| `reservas.listar(filtros)`          | `GET /reservas?status=&espacoId=&professorId=&de=&ate=&pagina=&porPagina=` → `{ itens, total }` | implementado (admin)                                     |
| `reservas.aprovar(id)`              | `POST /reservas/:id/aprovar`                                                                    | implementado (`204`, admin)                              |
| `reservas.rejeitar(id, motivo?)`    | `POST /reservas/:id/rejeitar`                                                                   | implementado (`204`, admin, motivo persistido)           |
| `reservas.cancelar(id, motivo?)`    | `POST /reservas/:id/cancelar`                                                                   | implementado (`204`, professor, motivo persistido)       |

## Adaptadores de compatibilidade

- `real/auth.ts` aceita respostas simples e o envelope de login usado por versões anteriores.
- `real/espacos.ts` completa campos ausentes e cruza disponibilidade com `GET /espacos` somente
  para servidores antigos que ainda retornam espaços parciais.
- `real/reservas.ts` adapta campos textuais/ausentes de servidores anteriores; a API atual já
  retorna reserva estruturada completa.

## Carga inicial e valores mockados

Quando `espacos` está vazio, o servidor importa automaticamente do catálogo CIn as 77 entradas
reserváveis: 64 salas, 10 laboratórios, 2 auditórios e 1 anfiteatro. Identificação, tipo e bloco
vêm do catálogo; os demais atributos não existem nessa fonte e recebem defaults de demonstração:
capacidade 40 para salas, 30 para laboratórios e 120 para auditórios, 20 computadores por
laboratório, zero tomadas e equipamentos/acessibilidade desativados. Espaços sem bloco conhecido
usam `AREA_2`. Revise esses valores antes de usar a base como cadastro oficial.

O catálogo completo, incluindo espaços não reserváveis, continua disponível em
`GET /api/catalogo/espacos`.

Para provisionar o primeiro administrador, defina `CIN_ADMIN_EMAIL` e `CIN_ADMIN_SENHA` ao iniciar
o servidor. Opcionalmente, informe `CIN_ADMIN_NOME`. Isso só cria uma conta quando ainda não existe
administrador; não há credenciais padrão embutidas. Remova as variáveis após o primeiro boot.

As rotas protegidas distinguem `401` (credenciais inválidas) de `403` (perfil sem permissão) e
retornam erros JSON com `codigo`. `CONFLITO_HORARIO` inclui todas as ocorrências em
`detalhes.conflitos`; rejeição e cancelamento aceitam e persistem `motivo`. A migração adiciona
`criada_em` e `motivo` a bancos existentes e preenche timestamps ausentes.

## Regras que o simulado aplica (e o backend também deve aplicar)

- Conflito com intervalos semiabertos `[início, fim)`: horários encostados não conflitam.
- Pendentes e aprovadas bloqueiam o horário; rejeitadas e canceladas liberam (P4).
- Espaço em manutenção não aparece na disponibilidade e recusa pedidos (`409
ESPACO_EM_MANUTENCAO`); reservas já feitas continuam válidas (P5).
- Só pendentes são aprovadas ou rejeitadas; o professor cancela só as próprias, pendentes ou
  aprovadas, que ainda não terminaram (P7) — senão `409 STATUS_INVALIDO`.
- Reservas recorrentes validam datas futuras, horários sobrepostos e se cada dia solicitado ocorre
  dentro do período; conflitos retornam as datas e faixas exatas para a interface destacar.
- Identificação de espaço única (`409 IDENTIFICACAO_DUPLICADA`), tipo imutável (P13) e remoção
  bloqueada se houver reservas (`409 ESPACO_COM_RESERVAS`).
- Agenda: o professor não vê quem reservou; o administrador vê (P12).

Os testes em `src/lib/api/simulado/simulado.test.ts` documentam essas regras e servem de
referência para os testes do backend.
