# Sistema de Reservas - Centro de Informática

**Página do projeto:** <https://rafaelalins-ctrl.github.io/sistema-reservas-cin/> (publicada a partir de [`site/`](site/)).

Backend em **C++** (Crow + SQLite) para o sistema de reserva de salas, laboratórios e
auditórios do CIn, seguindo o padrão **Repository** e um modelo de domínio polimórfico
para `Usuario` (Administrador/Professor) e `Espaco` (SalaAula/Laboratorio/Auditorio).

## Arquitetura

Veja o [relatorio do sistema](RELATORIO.md) para descricao de perfis, funcionalidades, modelo de
dominio, persistencia, interface grafica e limites conhecidos.

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
é criado/aberto automaticamente a partir do `schema.sql` na primeira execução. Se a tabela de
espaços estiver vazia, ele importa do catálogo CIn 77 espaços reserváveis; capacidade e atributos
ausentes do catálogo recebem valores de demonstração, descritos em
[`frontend/docs/integracao-backend.md`](frontend/docs/integracao-backend.md).

Para provisionar o primeiro administrador, defina `CIN_ADMIN_EMAIL` e `CIN_ADMIN_SENHA` antes de
iniciar o servidor; `CIN_ADMIN_NOME` é opcional. A conta só é criada se ainda não houver um
administrador. Não há senha administrativa padrão.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/espacos` | Lista e filtra espaços |
| GET | `/api/espacos/:id` | Detalha um espaço |
| POST | `/api/espacos` | Cria espaço (admin) |
| PUT/PATCH/DELETE | `/api/espacos/:id` | Edita, altera manutenção ou remove (admin) |
| GET | `/api/espacos/disponiveis` | Busca por data, horário e filtros |
| GET | `/api/espacos/:id/agenda?de=&ate=` | Agenda do espaço |
| GET | `/api/espacos/:id/reservas-futuras` | Contagem para admin |
| GET | `/api/catalogo/espacos` | Catálogo CIn completo, incluindo espaços não reserváveis |
| POST | `/api/auth/register` | Cadastra professor |
| POST | `/api/auth/login` | Autentica via HTTP Basic |
| GET/PUT/DELETE | `/api/usuarios/me` | Consulta, edita (nome, departamento, senha) ou remove a própria conta |
| GET | `/api/usuarios` | Lista usuários (admin) |
| GET/DELETE | `/api/usuarios/:id` | Consulta ou remove conta de professor (admin) |
| GET/POST | `/api/reservas` | Lista paginada (admin) e cria solicitação (professor) |
| GET | `/api/reservas/minhas` | Reservas do professor autenticado |
| GET | `/api/reservas/pendentes` | Fila admin |
| POST | `/api/reservas/:id/aprovar` | Aprova (admin) |
| POST | `/api/reservas/:id/rejeitar` | Rejeita (admin) |
| POST | `/api/reservas/:id/cancelar` | Cancela própria (professor) |

As rotas protegidas usam HTTP Basic com o e-mail e a senha da conta. O payload de
criação contém `idEspaco`, `dataInicio`, `dataFim` e `horarios`, uma lista de objetos
`{"dia":"SEGUNDA","inicioMin":480,"fimMin":540}`. Os horários são minutos desde
meia-noite e as datas usam `AAAA-MM-DD`.

Rejeição e cancelamento aceitam `{"motivo":"..."}` opcional. Em conflito de uma reserva
recorrente, a resposta `409` inclui `codigo: "CONFLITO_HORARIO"` e cada data/faixa em
`detalhes.conflitos`.

O cadastro público cria somente professores. Contas administrativas devem ser provisionadas
por um operador confiável para impedir que visitantes criem privilégios administrativos.

O servidor escuta apenas em `127.0.0.1`; em produção, publique-o atrás de um proxy
local que ofereça HTTPS. Nunca exponha HTTP Basic diretamente em uma rede.

## Próximos passos sugeridos

1. Adicionar testes automatizados de integração para autenticação, persistência e rotas Crow.
2. Revisar capacidade e equipamentos mockados antes de tratar o catálogo importado como cadastro oficial.

## Diagrama de classes

O modelo de domínio tem heranças `Usuario` → `Administrador`/`Professor` e
`Espaco` → `SalaAula`/`Laboratorio`/`Auditorio`, padrão Repository com `IRepositorio<T>`
e `SistemaDeReservas` como orquestrador. O diagrama completo e a explicação dos conceitos de POO
estão na seção 4 do [RELATORIO.md](RELATORIO.md).
