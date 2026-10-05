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

struct ConflitoReserva {
    // Data e intervalo, em minutos desde meia-noite, de uma ocorrencia ocupada.
    std::string data;
    int inicioMin;
    int fimMin;
};

// ==========================================
// CLASSE ORQUESTRADORA (conecta as rotas do Crow ao dominio/persistencia)
// ==========================================
class SistemaDeReservas {
private:
    RepositorioEspaco repoEspacos;
    RepositorioReserva repoReservas;
    RepositorioUsuario repoUsuarios;

    // Uma unica conexao SQLite atende todas as threads do Crow. Transacoes, last_insert_rowid
    // e changes sao estado da conexao, e a checagem de conflito precisa ser atomica com o
    // insert; por isso todo acesso ao banco passa por esta trava (ver travarBanco).
    std::mutex mutexBanco;

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
    std::shared_ptr<Usuario> autenticarUsuario(const std::string& email, const std::string& senha);
    bool cadastrarProfessor(const std::string& nome, const std::string& email,
                            const std::string& senha, const std::string& departamento);

    // Substitui os horarios de uma reserva existente, revalidando conflitos.
    bool alterarHorarioReserva(int idReserva, std::vector<Horario> novosHorarios);

    bool aprovarReserva(int idReserva);
    bool rejeitarReserva(int idReserva, const std::string& motivo = "");
    bool cancelarReserva(int idReserva, int idProfessor, const std::string& motivo = "");

    void removerEspacoDoSistema(int idEspaco);

    RepositorioEspaco& getRepositorioEspacos() { return repoEspacos; }
    RepositorioReserva& getRepositorioReservas() { return repoReservas; }
};
