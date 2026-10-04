#pragma once
#include <sqlite3.h>
#include <memory>
#include <string>
#include "models/Usuario.hpp"

class RepositorioUsuario {
private:
    sqlite3* db;

public:
    explicit RepositorioUsuario(sqlite3* db) : db(db) {}

    std::shared_ptr<Usuario> buscarPorEmail(const std::string& email) const;
    bool cadastrarProfessor(const std::string& nome, const std::string& email,
                            const std::string& senhaHash, const std::string& departamento);
};