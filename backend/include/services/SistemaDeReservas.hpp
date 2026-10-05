#pragma once
#include <array>
#include <chrono>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>
#include "repositories/RepositorioEspaco.hpp"
#include "repositories/RepositorioReserva.hpp"
#include "repositories/RepositorioUsuario.hpp"
#include "models/Horario.hpp"
#include "models/Reserva.hpp"
#include "models/Usuario.hpp"

// Uma ocorrencia que impede a reserva; a API devolve a lista no erro 409.
struct ConflitoReserva {
    // Data e intervalo, em minutos desde meia-noite, de uma ocorrencia ocupada.
    std::string data;
    int inicioMin;
    int fimMin;
};

enum class ResultadoRemocaoUsuario {
    REMOVIDO,
    NAO_ENCONTRADO,
    ADMINISTRADOR,   // Contas de administrador nao sao removidas pela API.
    POSSUI_RESERVAS  // Reservas guardam o historico do professor.
};

// ==========================================
// CLASSE ORQUESTRADORA (conecta as rotas do Crow ao dominio/persistencia)
// ==========================================
// Fachada (Facade) do backend: as rotas pedem operacoes de alto nivel e esta
// classe aplica as regras de negocio usando os repositorios. Os repositorios
// sao membros (composicao): nascem e morrem junto com o sistema.
class SistemaDeReservas {
private:
    RepositorioEspaco repoEspacos;
    RepositorioReserva repoReservas;
    RepositorioUsuario repoUsuarios;

    // Uma unica conexao SQLite atende todas as threads do Crow. Transacoes, last_insert_rowid
    // e changes sao estado da conexao, e a checagem de conflito precisa ser atomica com o
    // insert; por isso todo acesso ao banco passa por esta trava (ver travarBanco).
    std::mutex mutexBanco;

    // Cache curto de senhas ja conferidas, por email (ver autenticarUsuario).
    struct CredencialVerificada {
        std::array<unsigned char, 32> resumo;
        std::chrono::steady_clock::time_point expiraEm;
    };
    static constexpr std::chrono::minutes validadeCredencial{5};
    std::mutex mutexCredenciais;
    std::unordered_map<std::string, CredencialVerificada> credenciaisVerificadas;

    // Se informado, conflitos recebe todas as ocorrencias ocupadas encontradas.
    bool horariosDisponiveis(const Espaco& espaco, const std::vector<Horario>& horarios,
                             const std::string& dataInicio, const std::string& dataFim,
                             int idReservaIgnorada = 0,
                             std::vector<ConflitoReserva>* conflitos = nullptr);

public:
    // Recebe a conexao aberta pelo main, que continua responsavel por fechar.
    SistemaDeReservas(sqlite3* db)
        : repoEspacos(db), repoReservas(db, &repoEspacos), repoUsuarios(db) {}

    // Trava o banco ate o fim do escopo. As rotas a pegam depois de autenticar e a mantem
    // durante todo o acesso a repositorios. autenticarUsuario e cadastrarProfessor travam
    // sozinhos, so na parte do banco, para o hash de senha nao bloquear as outras requisicoes.
    std::unique_lock<std::mutex> travarBanco() { return std::unique_lock<std::mutex>(mutexBanco); }

    // Verifica se um Espaco esta livre num dado Horario/data (sem conflitos
    // com reservas ja APROVADAS/PENDENTES).
    bool verificarDisponibilidade(const Espaco& e, const Horario& h,
                                  const std::string& data, int idReservaIgnorada = 0);

    // Lista espacos que atendem capacidade minima e estao livres no horario informado.
    std::vector<std::shared_ptr<Espaco>> listarEspacosDisponiveis(
        const Horario& h, const std::string& data, int capMinima);

    // Valida permissao do solicitante, checa disponibilidade e persiste a reserva
    // (status inicial PENDENTE).
    bool processarNovaReserva(std::shared_ptr<Reserva> r,
                              std::vector<ConflitoReserva>* conflitos = nullptr);
    // Devolve o usuario (Professor ou Administrador) se email e senha conferem; senao nullptr.
    std::shared_ptr<Usuario> autenticarUsuario(const std::string& email, const std::string& senha);
    // Valida os dados e cria a conta. Retorna false se o email ja estiver em uso.
    bool cadastrarProfessor(const std::string& nome, const std::string& email,
                            const std::string& senha, const std::string& departamento);
    // Altera nome, departamento (so professores) e, se novaSenha nao for vazia, a senha.
    // Trava o banco sozinho, como cadastrarProfessor. Retorna false se o usuario nao existir.
    bool atualizarUsuario(int idUsuario, const std::string& nome,
                          const std::string& departamento, const std::string& novaSenha);
    // Exige a trava do banco (travarBanco) ja adquirida pelo chamador.
    ResultadoRemocaoUsuario removerUsuario(int idUsuario);

    // Retornam false se a reserva nao existir ou nao estiver num status que permita a acao.
    bool aprovarReserva(int idReserva);
    bool rejeitarReserva(int idReserva, const std::string& motivo = "");
    bool cancelarReserva(int idReserva, int idProfessor, const std::string& motivo = "");

    void removerEspacoDoSistema(int idEspaco);

    // Acesso aos repositorios para consultas simples das rotas (sempre com travarBanco).
    RepositorioEspaco& getRepositorioEspacos() { return repoEspacos; }
    RepositorioReserva& getRepositorioReservas() { return repoReservas; }
    RepositorioUsuario& getRepositorioUsuarios() { return repoUsuarios; }
};
