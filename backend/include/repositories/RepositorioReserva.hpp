#pragma once
#include <sqlite3.h>
#include "repositories/IRepositorio.hpp"
#include "repositories/RepositorioEspaco.hpp"
#include "models/Reserva.hpp"

// Persiste reservas e seus horarios semanais em tabelas relacionadas.
class RepositorioReserva : public IRepositorio<Reserva> {
private:
    sqlite3* db; // Conexao nao possuida por este repositorio.
    RepositorioEspaco* repoEspaco; // Dependencia nao possuida, usada ao reconstruir a reserva.

    std::vector<Horario> listarHorarios(int idReserva) const;
    std::shared_ptr<Reserva> mapearLinha(sqlite3_stmt* stmt) const;

public:
    RepositorioReserva(sqlite3* db, RepositorioEspaco* repoEspaco)
        : db(db), repoEspaco(repoEspaco) {}

    void salvar(std::shared_ptr<Reserva> obj) override;
    std::shared_ptr<Reserva> buscar(int id) override;
    // Grava status e motivo. Datas, espaco e professor nao mudam depois de criada.
    void atualizar(std::shared_ptr<Reserva> obj) override;
    // So altera o estado se a reserva ainda estiver pendente.
    bool atualizarStatusPendente(int id, StatusReserva status, const std::string& motivo = "");
    // Cancela somente reservas do professor que ainda nao terminaram.
    bool cancelarReserva(int id, int idProfessor, const std::string& hoje,
                         const std::string& motivo = "");
    void remover(int id) override;
    std::vector<std::shared_ptr<Reserva>> listarTodos() override;

    // Consultas especificas do dominio, alem do CRUD basico do IRepositorio.
    // Reservas do espaco cujo periodo inclui a data (qualquer status).
    std::vector<std::shared_ptr<Reserva>> listarPorEspacoEData(
        int idEspaco, const std::string& data, int idReservaIgnorada = 0);
};
