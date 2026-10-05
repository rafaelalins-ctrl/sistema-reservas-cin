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

sqlite3_stmt* preparar(sqlite3* db, const char* sql, const std::string& contexto) {
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error("Erro ao preparar " + contexto + ": " + sqlite3_errmsg(db));
    }
    return stmt;
}

// Insere um usuario. departamento nulo grava NULL (administradores).
// Retorna false se o email ja estiver cadastrado.
bool inserirUsuario(sqlite3* db, const std::string& nome, const std::string& email,
                    const std::string& senhaHash, const std::string& tipo,
                    const std::string* departamento) {
    sqlite3_stmt* stmt = preparar(db,
        "INSERT INTO usuarios (nome, email, senha_hash, tipo, departamento) VALUES (?, ?, ?, ?, ?);",
        "cadastro de usuario");

    const auto emailNormalizado = normalizarEmail(email);
    sqlite3_bind_text(stmt, 1, nome.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, emailNormalizado.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, senhaHash.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, tipo.c_str(), -1, SQLITE_TRANSIENT);
    if (departamento) {
        sqlite3_bind_text(stmt, 5, departamento->c_str(), -1, SQLITE_TRANSIENT);
    } else {
        sqlite3_bind_null(stmt, 5);
    }

    const int resultado = sqlite3_step(stmt);
    if (resultado == SQLITE_DONE) {
        sqlite3_finalize(stmt);
        return true;
    }

    const int codigoErro = sqlite3_errcode(db);
    const std::string mensagem = sqlite3_errmsg(db);
    sqlite3_finalize(stmt);
    if ((codigoErro & 0xff) == SQLITE_CONSTRAINT) return false;
    throw std::runtime_error("Erro ao cadastrar usuario: " + mensagem);
}
}

std::shared_ptr<Usuario> RepositorioUsuario::mapearLinha(sqlite3_stmt* stmt) const {
    const int id = sqlite3_column_int(stmt, 0);
    const auto nome = textoColuna(stmt, 1);
    const auto email = textoColuna(stmt, 2);
    const auto senhaHash = textoColuna(stmt, 3);
    const auto tipo = textoColuna(stmt, 4);
    if (tipo == "ADMINISTRADOR") {
        return std::make_shared<Administrador>(id, nome, email, senhaHash);
    }
    if (tipo == "PROFESSOR") {
        return std::make_shared<Professor>(id, nome, email, senhaHash, textoColuna(stmt, 5));
    }
    throw std::runtime_error("Tipo de usuario desconhecido no banco: " + tipo);
}

void RepositorioUsuario::salvar(std::shared_ptr<Usuario> obj) {
    if (!obj) throw std::invalid_argument("Usuario nao pode ser nulo.");
    const auto professor = std::dynamic_pointer_cast<Professor>(obj);
    const std::string* departamento = professor ? &professor->getDepartamento() : nullptr;
    if (!inserirUsuario(db, obj->getNome(), obj->getEmail(), obj->getSenhaHash(),
                        obj->tipo(), departamento)) {
        throw std::invalid_argument("Ja existe uma conta com esse e-mail.");
    }
    obj->setId(static_cast<int>(sqlite3_last_insert_rowid(db)));
}

std::shared_ptr<Usuario> RepositorioUsuario::buscar(int id) {
    sqlite3_stmt* stmt = preparar(db,
        "SELECT id, nome, email, senha_hash, tipo, departamento FROM usuarios WHERE id = ?;",
        "busca de usuario");
    sqlite3_bind_int(stmt, 1, id);

    std::shared_ptr<Usuario> resultado;
    const int status = sqlite3_step(stmt);
    try {
        if (status == SQLITE_ROW) {
            resultado = mapearLinha(stmt);
        } else if (status != SQLITE_DONE) {
            throw std::runtime_error(std::string("Erro ao buscar usuario: ") + sqlite3_errmsg(db));
        }
    } catch (...) {
        sqlite3_finalize(stmt);
        throw;
    }
    sqlite3_finalize(stmt);
    return resultado;
}

void RepositorioUsuario::atualizar(std::shared_ptr<Usuario> obj) {
    if (!obj) throw std::invalid_argument("Usuario nao pode ser nulo.");
    sqlite3_stmt* stmt = preparar(db,
        "UPDATE usuarios SET nome = ?, senha_hash = ?, departamento = ? WHERE id = ?;",
        "atualizacao de usuario");

    sqlite3_bind_text(stmt, 1, obj->getNome().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, obj->getSenhaHash().c_str(), -1, SQLITE_TRANSIENT);
    // Departamento so existe para professores; administradores ficam com NULL.
    if (auto professor = std::dynamic_pointer_cast<Professor>(obj)) {
        sqlite3_bind_text(stmt, 3, professor->getDepartamento().c_str(), -1, SQLITE_TRANSIENT);
    } else {
        sqlite3_bind_null(stmt, 3);
    }
    sqlite3_bind_int(stmt, 4, obj->getId());

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao atualizar usuario: " + mensagem);
    }
    sqlite3_finalize(stmt);
}

void RepositorioUsuario::remover(int id) {
    sqlite3_stmt* stmt = preparar(db, "DELETE FROM usuarios WHERE id = ?;", "remocao de usuario");
    sqlite3_bind_int(stmt, 1, id);
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao remover usuario: " + mensagem);
    }
    sqlite3_finalize(stmt);
}

std::vector<std::shared_ptr<Usuario>> RepositorioUsuario::listarTodos() {
    sqlite3_stmt* stmt = preparar(db,
        "SELECT id, nome, email, senha_hash, tipo, departamento FROM usuarios ORDER BY nome, id;",
        "listagem de usuarios");

    std::vector<std::shared_ptr<Usuario>> resultado;
    try {
        int status;
        while ((status = sqlite3_step(stmt)) == SQLITE_ROW) {
            resultado.push_back(mapearLinha(stmt));
        }
        if (status != SQLITE_DONE) {
            throw std::runtime_error(std::string("Erro ao listar usuarios: ") + sqlite3_errmsg(db));
        }
    } catch (...) {
        sqlite3_finalize(stmt);
        throw;
    }
    sqlite3_finalize(stmt);
    return resultado;
}

std::shared_ptr<Usuario> RepositorioUsuario::buscarPorEmail(const std::string& email) const {
    sqlite3_stmt* stmt = preparar(db,
        "SELECT id, nome, email, senha_hash, tipo, departamento FROM usuarios WHERE email = ?;",
        "busca de usuario");
    const auto emailNormalizado = normalizarEmail(email);
    sqlite3_bind_text(stmt, 1, emailNormalizado.c_str(), -1, SQLITE_TRANSIENT);

    std::shared_ptr<Usuario> resultado;
    const int status = sqlite3_step(stmt);
    try {
        if (status == SQLITE_ROW) {
            resultado = mapearLinha(stmt);
        } else if (status != SQLITE_DONE) {
            throw std::runtime_error(std::string("Erro ao buscar usuario: ") + sqlite3_errmsg(db));
        }
    } catch (...) {
        sqlite3_finalize(stmt);
        throw;
    }
    sqlite3_finalize(stmt);
    return resultado;
}

bool RepositorioUsuario::existeAdministrador() const {
    sqlite3_stmt* stmt = preparar(db, "SELECT 1 FROM usuarios WHERE tipo = 'ADMINISTRADOR' LIMIT 1;",
                                  "consulta de administradores");
    const bool existe = sqlite3_step(stmt) == SQLITE_ROW;
    sqlite3_finalize(stmt);
    return existe;
}

bool RepositorioUsuario::possuiReservas(int idUsuario) const {
    sqlite3_stmt* stmt = preparar(db, "SELECT 1 FROM reservas WHERE id_professor = ? LIMIT 1;",
                                  "consulta de reservas do usuario");
    sqlite3_bind_int(stmt, 1, idUsuario);
    const int status = sqlite3_step(stmt);
    if (status != SQLITE_ROW && status != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao consultar reservas do usuario: " + mensagem);
    }
    sqlite3_finalize(stmt);
    return status == SQLITE_ROW;
}

bool RepositorioUsuario::cadastrarProfessor(
    const std::string& nome, const std::string& email,
    const std::string& senhaHash, const std::string& departamento) {
    return inserirUsuario(db, nome, email, senhaHash, "PROFESSOR", &departamento);
}

bool RepositorioUsuario::cadastrarAdministrador(
    const std::string& nome, const std::string& email, const std::string& senhaHash) {
    return inserirUsuario(db, nome, email, senhaHash, "ADMINISTRADOR", nullptr);
}
