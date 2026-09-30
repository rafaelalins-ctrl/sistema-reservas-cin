# Sistema de Reservas - Centro de Informática

Backend em **C++** (Crow + SQLite) para o sistema de reserva de salas, laboratórios e
auditórios do CIn, seguindo o padrão **Repository** e um modelo de domínio polimórfico
para `Usuario` (Administrador/Professor) e `Espaco` (SalaAula/Laboratorio/Auditorio).

## Arquitetura

```
Cliente (React) --HTTP/JSON--> Crow (rotas) --> SistemaDeReservas (regras) --> Repositorios --> SQLite
```

- **Crow**: expõe os endpoints REST.
- **SistemaDeReservas**: orquestra regras de negócio (disponibilidade, permissões, etc).
- **Repositorios** (`IRepositorio<T>`): abstraem o acesso a dados via prepared statements.
- **SQLite**: persistência em arquivo `.db`.

## Estrutura de pastas

```
backend/
├── include/
│   ├── models/         # Entidades e enums do domínio (headers)
│   ├── repositories/   # Interface IRepositorio<T> + implementações SQLite
│   └── services/        # SistemaDeReservas (regras de negócio)
├── src/
│   ├── models/          # Implementação das entidades
│   ├── repositories/     # Implementação dos repositórios
│   ├── services/          # Implementação do SistemaDeReservas
│   └── main.cpp           # Bootstrap do Crow + rotas
├── database/
│   └── schema.sql         # DDL das tabelas
└── CMakeLists.txt
frontend/                    # React + Vite + TS, Tailwind v4, shadcn/ui (ver frontend/README.md)
```

## Dependências

- CMake >= 3.16
- Compilador C++17
- [Crow](https://github.com/CrowCpp/Crow) (baixado automaticamente via `FetchContent`)
- SQLite3 (`libsqlite3-dev` no Ubuntu/Debian, `sqlite3` no Homebrew)

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install build-essential cmake libsqlite3-dev
```

## Build & Run

```bash
mkdir -p backend/build && cd backend/build
cmake ..
cmake --build . -j
./sistema_reservas
```

O servidor sobe por padrão em `http://localhost:18080`. O arquivo `database/reservas.db`
é criado/aberto automaticamente a partir do `schema.sql` na primeira execução.

## Endpoints de exemplo (já stubados em `main.cpp`)

| Método | Rota                  | Descrição                                |
|--------|------------------------|-------------------------------------------|
| GET    | `/api/espacos`          | Lista todos os espaços cadastrados        |
| GET    | `/api/espacos/disponiveis?dia=&inicio=&fim=&capacidade=` | Lista espaços disponíveis num horário |
| POST   | `/api/reservas`         | Cria uma nova solicitação de reserva      |
| POST   | `/api/reservas/:id/aprovar` | Aprova uma reserva (Administrador)   |

Esses handlers estão como **esqueleto** — a lógica de parsing de JSON e chamadas ao
`SistemaDeReservas` deve ser completada conforme o CRUD avança.

## Próximos passos sugeridos

1. Completar o parsing/serialização JSON em `main.cpp` (usar `crow::json`).
2. Implementar a reconstrução polimórfica de `Espaco` em `RepositorioEspaco`
   (coluna `tipo` na tabela `espacos` já está prevista no `schema.sql`).
3. Implementar autenticação (hash de senha) em `Usuario::fazerLogin`.
4. Construir as telas do frontend (`frontend/`, base e identidade do CIn já prontas) consumindo os endpoints REST.
5. Adicionar testes (ex: Catch2/GoogleTest) para `Horario::conflitaCom` e
   `SistemaDeReservas::verificarDisponibilidade`.

## Diagrama de classes

O modelo de domínio segue o diagrama fornecido: heranças `Usuario` → `Administrador`/`Professor`,
`Espaco` → `SalaAula`/`Laboratorio`/`Auditorio`, padrão Repository com `IRepositorio<T>`,
e `SistemaDeReservas` como orquestrador.
