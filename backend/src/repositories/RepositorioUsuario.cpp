#include "repositories/RepositorioUsuario.hpp"
#include "models/Administrador.hpp"
#include "models/Professor.hpp"
#include <algorithm>
#include <cctype>
#include <stdexcept>

namespace {
std::string textoColuna(sqlite3_stmt* stmt, int coluna) {
    const auto* valor = sqlite3_column_text(stmt, coluna);
    return valor ? reinterpret_cast<const char*>(valor) : "";
}

// Mantem buscas e cadastros consistentes mesmo se o email vier em outra caixa.
std::string normalizarEmail(const std::string& email) {
    std::string normalizado = email;
    std::transform(normalizado.begin(), normalizado.end(), normalizado.begin(), [](unsigned char caractere) {
        return static_cast<char>(std::tolower(caractere));
    });
    return normalizado;
}
}

std::shared_ptr<Usuario> RepositorioUsuario::buscarPorEmail(const std::string& email) const {
    const char* sql =
        "SELECT id, nome, email, senha_hash, tipo, departamento FROM usuarios WHERE email = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar busca de usuario: ") + sqlite3_errmsg(db));
    }
    const auto emailNormalizado = normalizarEmail(email);
    sqlite3_bind_text(stmt, 1, emailNormalizado.c_str(), -1, SQLITE_TRANSIENT);

    std::shared_ptr<Usuario> resultado;
    const int status = sqlite3_step(stmt);
    if (status == SQLITE_ROW) {
        const int id = sqlite3_column_int(stmt, 0);
        const auto nome = textoColuna(stmt, 1);
        const auto emailUsuario = textoColuna(stmt, 2);
        const auto senhaHash = textoColuna(stmt, 3);
        const auto tipo = textoColuna(stmt, 4);
        if (tipo == "ADMINISTRADOR") {
            resultado = std::make_shared<Administrador>(id, nome, emailUsuario, senhaHash);
        } else if (tipo == "PROFESSOR") {
            resultado = std::make_shared<Professor>(
                id, nome, emailUsuario, senhaHash, textoColuna(stmt, 5));
        } else {
            sqlite3_finalize(stmt);
            throw std::runtime_error("Tipo de usuario desconhecido no banco: " + tipo);
        }
    } else if (status != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao buscar usuario: " + mensagem);
    }
    sqlite3_finalize(stmt);
    return resultado;
}

bool RepositorioUsuario::existeAdministrador() const {
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, "SELECT 1 FROM usuarios WHERE tipo = 'ADMINISTRADOR' LIMIT 1;",
                           -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao consultar administradores: ") + sqlite3_errmsg(db));
    }
    const bool existe = sqlite3_step(stmt) == SQLITE_ROW;
    sqlite3_finalize(stmt);
    return existe;
}

bool RepositorioUsuario::cadastrarProfessor(
    const std::string& nome, const std::string& email,
    const std::string& senhaHash, const std::string& departamento) {
    const char* sql =
        "INSERT INTO usuarios (nome, email, senha_hash, tipo, departamento) "
        "VALUES (?, ?, ?, 'PROFESSOR', ?);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar cadastro de professor: ") + sqlite3_errmsg(db));
    }

    const auto emailNormalizado = normalizarEmail(email);
    sqlite3_bind_text(stmt, 1, nome.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, emailNormalizado.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, senhaHash.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, departamento.c_str(), -1, SQLITE_TRANSIENT);

    const int resultado = sqlite3_step(stmt);
    if (resultado == SQLITE_DONE) {
        sqlite3_finalize(stmt);
        return true;
    }

    const int codigoErro = sqlite3_errcode(db);
    const std::string mensagem = sqlite3_errmsg(db);
    sqlite3_finalize(stmt);
    if ((codigoErro & 0xff) == SQLITE_CONSTRAINT) return false;
    throw std::runtime_error("Erro ao cadastrar professor: " + mensagem);
}

bool RepositorioUsuario::cadastrarAdministrador(
    const std::string& nome, const std::string& email, const std::string& senhaHash) {
    const char* sql =
        "INSERT INTO usuarios (nome, email, senha_hash, tipo, departamento) "
        "VALUES (?, ?, ?, 'ADMINISTRADOR', NULL);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar cadastro de administrador: ") + sqlite3_errmsg(db));
    }

    const auto emailNormalizado = normalizarEmail(email);
    sqlite3_bind_text(stmt, 1, nome.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, emailNormalizado.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, senhaHash.c_str(), -1, SQLITE_TRANSIENT);

    const int resultado = sqlite3_step(stmt);
    if (resultado == SQLITE_DONE) {
        sqlite3_finalize(stmt);
        return true;
    }

    const int codigoErro = sqlite3_errcode(db);
    const std::string mensagem = sqlite3_errmsg(db);
    sqlite3_finalize(stmt);
    if ((codigoErro & 0xff) == SQLITE_CONSTRAINT) return false;
    throw std::runtime_error("Erro ao cadastrar administrador: " + mensagem);
}