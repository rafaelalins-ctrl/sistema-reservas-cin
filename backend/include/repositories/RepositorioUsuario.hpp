#pragma once
#include <sqlite3.h>
#include <memory>
#include <string>
#include <vector>
#include "models/Usuario.hpp"
#include "repositories/IRepositorio.hpp"

// CRUD de usuarios no banco SQLite. Devolve sempre o tipo concreto (Professor ou
// Administrador) atras de um ponteiro para Usuario.
class RepositorioUsuario : public IRepositorio<Usuario> {
private:
    sqlite3* db; // A conexao pertence ao SistemaDeReservas/main.

    // Converte uma linha (id, nome, email, senha_hash, tipo, departamento) no objeto concreto.
    std::shared_ptr<Usuario> mapearLinha(sqlite3_stmt* stmt) const;

public:
    explicit RepositorioUsuario(sqlite3* db) : db(db) {}

    // Insere o usuario e preenche o id gerado. Lanca std::invalid_argument se o email ja existir.
    void salvar(std::shared_ptr<Usuario> obj) override;
    std::shared_ptr<Usuario> buscar(int id) override;
    // Grava nome, senha_hash e, para professores, departamento. O email e o tipo nao mudam.
    void atualizar(std::shared_ptr<Usuario> obj) override;
    void remover(int id) override;
    std::vector<std::shared_ptr<Usuario>> listarTodos() override;

    std::shared_ptr<Usuario> buscarPorEmail(const std::string& email) const;
    // Usado no inicio do servidor para evitar criar mais de um admin inicial.
    bool existeAdministrador() const;
    // Reservas guardam o professor por chave estrangeira; quem tem reservas nao pode ser removido.
    bool possuiReservas(int idUsuario) const;
    bool cadastrarProfessor(const std::string& nome, const std::string& email,
                            const std::string& senhaHash, const std::string& departamento);
    bool cadastrarAdministrador(const std::string& nome, const std::string& email,
                                const std::string& senhaHash);
};
