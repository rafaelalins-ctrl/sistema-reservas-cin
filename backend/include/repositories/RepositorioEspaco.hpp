#pragma once
#include <sqlite3.h>
#include "repositories/IRepositorio.hpp"
#include "models/Espaco.hpp"

class RepositorioEspaco : public IRepositorio<Espaco> {
private:
    sqlite3* db; // conexao nao-possuida (owned pelo SistemaDeReservas / main)

    // Reconstroi o subtipo concreto (SalaAula/Laboratorio/Auditorio) a partir
    // de uma linha do sqlite3_stmt, usando a coluna 'tipo'.
    std::shared_ptr<Espaco> mapearLinha(sqlite3_stmt* stmt) const;

public:
    explicit RepositorioEspaco(sqlite3* db) : db(db) {}

    void salvar(std::shared_ptr<Espaco> obj) override;
    std::shared_ptr<Espaco> buscar(int id) override;
    void atualizar(std::shared_ptr<Espaco> obj) override;
    void remover(int id) override;
    std::vector<std::shared_ptr<Espaco>> listarTodos() override;
};
