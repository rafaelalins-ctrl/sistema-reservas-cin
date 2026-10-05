# Roteiro do vídeo

Vídeo para o YouTube pedido no projeto prático: mostrar as funcionalidades e explicar os
conceitos de POO usados e **como** foram usados. Duração alvo: 8 a 10 minutos. Cada bloco
indica o que aparece na tela e as falas-chave; o texto não precisa ser lido literalmente.

## Preparação

- Backend rodando (ver `README.md`) com o banco limpo e o administrador provisionado, ou o
  frontend com `VITE_API_SIMULADA=todos` se o backend não estiver disponível no dia.
- Duas janelas do navegador: uma logada como professor, outra como administrador.
- Editor aberto em `backend/` com os arquivos citados na parte 5 já em abas, na ordem.
- O diagrama de classes aberto (seção 4.1 do `RELATORIO.md`, renderizado no GitHub, ou a
  página do projeto).

## Divisão do vídeo

| # | Bloco | Tempo | Quem apresenta |
| --- | --- | --- | --- |
| 1 | Abertura e problema | 0:00–0:45 | |
| 2 | Demonstração: professor | 0:45–2:45 | |
| 3 | Demonstração: administrador | 2:45–4:15 | |
| 4 | Diagrama de classes | 4:15–5:00 | |
| 5 | Conceitos de POO no código | 5:00–8:30 | |
| 6 | Arquitetura, banco e fechamento | 8:30–9:30 | |

## 1. Abertura e problema (0:00–0:45)

**Tela:** página do projeto (`site/index.html`) ou a tela inicial do sistema.

- Apresentação do grupo (nome de cada integrante).
- O problema: reservar salas, laboratórios e auditórios do CIn hoje depende de conversas e
  planilhas. O sistema centraliza consulta de disponibilidade, pedidos e aprovação.
- É um sistema de informação em C++ com CRUD e banco de dados, como pede o projeto.

## 2. Demonstração: professor (0:45–2:45)

1. **Cadastro** (`/cadastro`): criar uma conta de professor. Mencionar que a senha é salva com
   hash (PBKDF2), nunca em texto.
2. **Disponibilidade** (`/app/disponibilidade`): buscar por data, horário e capacidade.
3. **Nova reserva** (`/app/reservas/nova`): pedido recorrente (ex.: terças e quintas no
   semestre). Tentar um horário já ocupado e mostrar que o sistema lista **as datas exatas em
   conflito**.
4. **Minhas reservas** (`/app/minhas-reservas`): o pedido aparece como *Pendente*. Cancelar um
   pedido.
5. **Minha conta** (`/conta`): editar nome/departamento e trocar a senha. Tentar excluir a
   conta e mostrar a mensagem de que contas com reservas não podem ser excluídas.

## 3. Demonstração: administrador (2:45–4:15)

1. **Solicitações** (`/app/solicitacoes`): aprovar o pedido feito no bloco 2; rejeitar outro
   com motivo.
2. **Espaços** (`/app/espacos`): mostrar os três tipos. Abrir um laboratório e um auditório
   e apontar que **cada tipo mostra atributos diferentes** (gancho para o polimorfismo).
3. Criar um espaço novo, editar e colocá-lo em manutenção; mostrar que ele some da
   disponibilidade.
4. Tentar remover um espaço com reservas: o sistema bloqueia.

## 4. Diagrama de classes (4:15–5:00)

**Tela:** diagrama da seção 4.1 do `RELATORIO.md`.

- Duas hierarquias: `Usuario` → `Professor`/`Administrador` e `Espaco` →
  `SalaAula`/`Laboratorio`/`Auditorio`.
- `Reserva` liga um professor e um espaço e é composta por `Horario`s.
- `IRepositorio<T>` com três implementações; `SistemaDeReservas` é dono dos repositórios.

## 5. Conceitos de POO no código (5:00–8:30)

Seguir a ordem da seção 4 do `RELATORIO.md`, cerca de 30 segundos por conceito, sempre com o
arquivo aberto.

| Conceito | Arquivo para mostrar | O que dizer |
| --- | --- | --- |
| Encapsulamento | `backend/include/models/Reserva.hpp`, `backend/src/models/Horario.cpp` | Atributos `private`, acesso por getters `const`; o construtor de `Horario` rejeita intervalos inválidos. |
| Modificadores de acesso | `backend/include/models/Espaco.hpp` | `protected` nos atributos comuns (as subclasses usam), `private` nos específicos, `public` na interface. |
| Herança | `backend/include/models/SalaAula.hpp`, `backend/src/models/SalaAula.cpp` | `class SalaAula : public Espaco`; o construtor repassa a parte comum para `Espaco(...)`. Em `backend/include/models/Administrador.hpp`, `using Usuario::Usuario`. |
| Classe abstrata e interface | `backend/include/models/Espaco.hpp`, `backend/include/repositories/IRepositorio.hpp` | Métodos `= 0` impedem instanciar `Espaco`; `IRepositorio<T>` só tem virtuais puros. Destrutor virtual. |
| Polimorfismo | `backend/src/services/SistemaDeReservas.cpp` (`processarNovaReserva`), `backend/src/models/Professor.cpp`, `backend/src/models/Administrador.cpp` | A mesma chamada `validarPermissaoReserva` tem regras diferentes para professor e administrador. Mostrar também `obterDescricaoDetalhada` nas três subclasses de `Espaco`. |
| Sobrecarga e template | `backend/include/models/Enums.hpp`, `backend/include/repositories/IRepositorio.hpp` | `toString` para cada enum; um único molde `IRepositorio<T>` para três entidades. |
| Ponteiros e referências | `backend/include/models/Reserva.hpp`, `backend/include/repositories/RepositorioReserva.hpp` | `shared_ptr` para professor e espaço (posse compartilhada); `sqlite3*` e `RepositorioEspaco*` não são donos; referências `const Espaco&`. |
| Padrões de projeto | `backend/src/repositories/RepositorioEspaco.cpp` (`mapearLinha`), `backend/include/services/SistemaDeReservas.hpp` | Repository (SQL isolado), Factory (cria o subtipo certo pela coluna `tipo`), Facade (`SistemaDeReservas`), RAII (`travarBanco`). |

## 6. Arquitetura, banco e fechamento (8:30–9:30)

**Tela:** diagrama de arquitetura da seção 5 do `RELATORIO.md` e `backend/database/schema.sql`.

- React → API REST (Crow) → `SistemaDeReservas` → repositórios → SQLite.
- Tabelas `usuarios`, `espacos`, `reservas` e `reserva_horarios`; CRUD de espaços e usuários,
  ciclo de vida das reservas.
- Fechamento: o que o grupo aprendeu e o que faria a seguir (ex.: testes de integração da API).

## Quem fez o quê

Preencher antes de gravar; a mesma divisão vai para a página do projeto (`site/index.html`,
seção Grupo).

| Integrante | Contribuição no projeto | Parte no vídeo |
| --- | --- | --- |
| | | |
| | | |
| | | |
| | | |
