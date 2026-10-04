#pragma once
#include <sqlite3.h>
#include <memory>
#include <string>
#include "models/Usuario.hpp"

// Consulta e cadastra usuarios no banco SQLite.
class RepositorioUsuario {
private:
    sqlite3* db; // A conexao pertence ao SistemaDeReservas/main.

public:
    explicit RepositorioUsuario(sqlite3* db) : db(db) {}

    std::shared_ptr<Usuario> buscarPorEmail(const std::string& email) const;
    // Usado no inicio do servidor para evitar criar mais de um admin inicial.
    bool existeAdministrador() const;
    bool cadastrarProfessor(const std::string& nome, const std::string& email,
                            const std::string& senhaHash, const std::string& departamento);
    bool cadastrarAdministrador(const std::string& nome, const std::string& email,
                                const std::string& senhaHash);
};