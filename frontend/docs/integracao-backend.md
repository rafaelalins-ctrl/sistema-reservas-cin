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

| Valor                          | Efeito                                                   |
| ------------------------------ | -------------------------------------------------------- |
| _(ausente)_                    | `todos` em `npm run dev`; tudo real no build de produção |
| `todos`                        | tudo simulado                                            |
| `espacos,reservas`             | autenticação real, espaços e reservas simulados          |
| `espacos`                      | só espaços simulados                                     |
| _(vazio)_ `VITE_API_SIMULADA=` | tudo real                                                |

Com a autenticação simulada, a sessão sobrevive ao recarregar (fica no `sessionStorage`). Com a
real, a senha do HTTP Basic fica só em memória e recarregar a página pede login de novo (P3).

O simulado é um chunk separado, carregado sob demanda: quem usa só a API real não o baixa.

## Mapa das rotas

| Função em `api`                     | Rota esperada                                                                                   | Situação na branch `funcionalidades`         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `auth.cadastrar(dados)`             | `POST /auth/register`                                                                           | existe                                       |
| `auth.entrar(credenciais)`          | `POST /auth/login` (Basic)                                                                      | existe; sem `id`/`departamento` (adaptado)   |
| `espacos.listar(filtros)`           | `GET /espacos?tipo=&bloco=&…`                                                                   | existe com poucos campos (adaptado)          |
| `espacos.obter(id)`                 | `GET /espacos/:id`                                                                              | não existe                                   |
| `espacos.disponiveis(filtros)`      | `GET /espacos/disponiveis?data=&inicio=&fim=&capacidadeMin=`                                    | existe; envia também `dia` e `capacidade`    |
| `espacos.agenda(id, { de, ate })`   | `GET /espacos/:id/agenda?de=&ate=`                                                              | não existe (há `/catalogo/...`, outro id)    |
| `espacos.criar(entrada)`            | `POST /espacos`                                                                                 | não existe                                   |
| `espacos.atualizar(id, entrada)`    | `PUT /espacos/:id`                                                                              | não existe                                   |
| `espacos.alterarManutencao(id, v)`  | `PATCH /espacos/:id` `{ emManutencao }`                                                         | não existe                                   |
| `espacos.remover(id)`               | `DELETE /espacos/:id`                                                                           | não existe                                   |
| `espacos.contarReservasFuturas(id)` | `GET /espacos/:id/reservas-futuras` → `{ total }`                                               | não existe                                   |
| `reservas.criar(nova)`              | `POST /reservas`                                                                                | existe; responde `{ id, status }` (adaptado) |
| `reservas.minhas()`                 | `GET /reservas/minhas`                                                                          | existe; `espaco` em texto (adaptado)         |
| `reservas.pendentes()`              | `GET /reservas/pendentes`                                                                       | existe                                       |
| `reservas.listar(filtros)`          | `GET /reservas?status=&espacoId=&professorId=&de=&ate=&pagina=&porPagina=` → `{ itens, total }` | não existe                                   |
| `reservas.aprovar(id)`              | `POST /reservas/:id/aprovar`                                                                    | existe (`204`)                               |
| `reservas.rejeitar(id, motivo?)`    | `POST /reservas/:id/rejeitar`                                                                   | existe; sem `motivo`                         |
| `reservas.cancelar(id, motivo?)`    | `POST /reservas/:id/cancelar`                                                                   | existe; sem `motivo`                         |

## Adaptadores (apagar quando a API seguir o contrato)

- `real/auth.ts` → `adaptarUsuario`: aceita `{ nome, email, tipo }` sem `id`.
- `real/espacos.ts` → `adaptarEspaco`: completa atributos ausentes com valores neutros; e
  `disponiveis` cruza com `GET /espacos` quando a resposta vem só com `id, identificacao,
capacidade`.
- `real/reservas.ts` → `adaptarReserva`: converte `espaco`/`professor` em texto para objetos.
  `criar` monta a `Reserva` a partir do pedido quando a resposta é só `{ id, status }`.

## O que o backend precisa para tirar cada recurso do simulado

1. **Erros em JSON** com `codigo` (lista em `CodigoErro`, `tipos.ts`) e `campo` quando for erro de
   um campo. Sem `codigo`, a tela mostra a mensagem genérica do status.
2. **`401` × `403`**: hoje o perfil errado devolve `401`, que encerra a sessão no frontend.
3. **`409 CONFLITO_HORARIO` com `detalhes.conflitos`** (`[{ data, inicioMin, fimMin }]`) para o
   formulário de reserva semanal listar as ocorrências em conflito.
4. Rotas de escrita de espaços, `GET /espacos/:id`, agenda por id de `espacos`, `GET /reservas`
   paginado e a contagem de reservas futuras.
5. Carga inicial de espaços e de um administrador (P1, P2), senão a disponibilidade volta vazia.

Campo `motivo` (rejeição e cancelamento): a interface só o mostra quando
`suportaMotivo` é verdadeiro (`index.ts`, hoje = reservas simuladas). Quando a API aceitar
`motivo`, troque a condição.

## Regras que o simulado aplica (e o backend também deve aplicar)

- Conflito com intervalos semiabertos `[início, fim)`: horários encostados não conflitam.
- Pendentes e aprovadas bloqueiam o horário; rejeitadas e canceladas liberam (P4).
- Espaço em manutenção não aparece na disponibilidade e recusa pedidos (`409
ESPACO_EM_MANUTENCAO`); reservas já feitas continuam válidas (P5).
- Só pendentes são aprovadas ou rejeitadas; o professor cancela só as próprias, pendentes ou
  aprovadas, que ainda não terminaram (P7) — senão `409 STATUS_INVALIDO`.
- Identificação de espaço única (`409 IDENTIFICACAO_DUPLICADA`), tipo imutável (P13) e remoção
  bloqueada se houver reservas (`409 ESPACO_COM_RESERVAS`).
- Agenda: o professor não vê quem reservou; o administrador vê (P12).

Os testes em `src/lib/api/simulado/simulado.test.ts` documentam essas regras e servem de
referência para os testes do backend.
