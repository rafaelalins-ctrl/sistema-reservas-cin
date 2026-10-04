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
- OpenSSL Crypto (`libssl-dev` no Ubuntu/Debian, `openssl` no Homebrew)

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install build-essential cmake libsqlite3-dev libssl-dev
```

### Windows (vcpkg)
```powershell
git clone https://github.com/microsoft/vcpkg.git C:\vcpkg
& C:\vcpkg\bootstrap-vcpkg.bat
$env:VCPKG_ROOT = "C:\vcpkg"
& "$env:VCPKG_ROOT\vcpkg.exe" install sqlite3 openssl --triplet x64-mingw-dynamic
cmake -S backend -B backend/build-mingw `
   -DCMAKE_TOOLCHAIN_FILE="$env:VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake" `
   -DVCPKG_TARGET_TRIPLET=x64-mingw-dynamic
cmake --build backend/build-mingw
Push-Location backend/build-mingw
.\sistema_reservas.exe
```

Clone e bootstrap do vcpkg são necessários apenas na primeira instalação. Mantenha o terminal
do executável aberto enquanto usar o frontend; o Vite encaminha `/api` para `127.0.0.1:18080`.

## Build & Run

```bash
mkdir -p backend/build && cd backend/build
cmake ..
cmake --build . -j
./sistema_reservas
```

### Teste rápido das classes de domínio (MinGW)

Não precisa esperar o vcpkg: na raiz do projeto, rode:

```powershell
.\backend\tests\run_model_smoke.ps1
```

Esse teste compila diretamente os modelos de horário, espaço e reserva. Ele não valida SQLite,
autenticação ou a comunicação HTTP.

As senhas devem ser armazenadas como hashes gerados por `Usuario::gerarHashSenha`,
no formato `pbkdf2_sha256$iteracoes$salt_base64$hash_base64`. Hashes em texto puro
ou em formatos desconhecidos sao rejeitados. Use esse metodo em uma ferramenta
administrativa confiavel ao provisionar usuarios.

O servidor sobe por padrão em `http://localhost:18080`. O arquivo `database/reservas.db`
é criado/aberto automaticamente a partir do `schema.sql` na primeira execução.

## Endpoints

| Método | Rota                  | Descrição                                |
|--------|------------------------|-------------------------------------------|
| GET    | `/api/espacos`          | Lista todos os espaços cadastrados        |
| GET    | `/api/espacos/disponiveis?dia=&inicio=&fim=&data=&capacidade=` | Lista espaços disponíveis numa data e horário |
| POST   | `/api/auth/register` | Cadastra uma conta de professor |
| POST   | `/api/auth/login` | Confere e-mail e senha no banco e retorna o perfil |
| POST   | `/api/reservas`         | Cria uma solicitação (Professor autenticado) |
| POST   | `/api/reservas/:id/aprovar` | Aprova uma reserva (Administrador) |
| POST   | `/api/reservas/:id/rejeitar` | Rejeita uma reserva (Administrador) |
| POST   | `/api/reservas/:id/cancelar` | Cancela uma reserva própria (Professor) |

As rotas protegidas usam HTTP Basic com o e-mail e a senha da conta. O payload de
criação contém `idEspaco`, `dataInicio`, `dataFim` e `horarios`, uma lista de objetos
`{"dia":"SEGUNDA","inicioMin":480,"fimMin":540}`. Os horários são minutos desde
meia-noite e as datas usam `AAAA-MM-DD`.

O cadastro público cria somente professores. Contas administrativas devem ser provisionadas
por um operador confiável para impedir que visitantes criem privilégios administrativos.

O servidor escuta apenas em `127.0.0.1`; em produção, publique-o atrás de um proxy
local que ofereça HTTPS. Nunca exponha HTTP Basic diretamente em uma rede.

## Próximos passos sugeridos

1. Construir as telas do frontend (`frontend/`, base e identidade do CIn já prontas) consumindo os endpoints REST.
2. Adicionar testes (ex: Catch2/GoogleTest) para `Horario::conflitaCom` e
   `SistemaDeReservas::verificarDisponibilidade`.

## Diagrama de classes

O modelo de domínio segue o diagrama fornecido: heranças `Usuario` → `Administrador`/`Professor`,
`Espaco` → `SalaAula`/`Laboratorio`/`Auditorio`, padrão Repository com `IRepositorio<T>`,
e `SistemaDeReservas` como orquestrador.
