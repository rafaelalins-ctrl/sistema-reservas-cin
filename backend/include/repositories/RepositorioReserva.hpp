#pragma once
#include <sqlite3.h>
#include "repositories/IRepositorio.hpp"
#include "repositories/RepositorioEspaco.hpp"
#include "models/Reserva.hpp"

class RepositorioReserva : public IRepositorio<Reserva> {
private:
    sqlite3* db;              // conexao nao-possuida
    RepositorioEspaco* repoEspaco; // usado para resolver Reserva::espaco ao ler do banco

public:
    RepositorioReserva(sqlite3* db, RepositorioEspaco* repoEspaco)
        : db(db), repoEspaco(repoEspaco) {}

    void salvar(std::shared_ptr<Reserva> obj) override;
    std::shared_ptr<Reserva> buscar(int id) override;
    void atualizar(std::shared_ptr<Reserva> obj) override;
    void remover(int id) override;
    std::vector<std::shared_ptr<Reserva>> listarTodos() override;

    // Consultas especificas do dominio, alem do CRUD basico do IRepositorio.
    std::vector<std::shared_ptr<Reserva>> listarPorEspacoEData(int idEspaco, const std::string& data);
};
