#include "repositories/RepositorioReserva.hpp"
#include "models/Professor.hpp"
#include <stdexcept>
#include <string>

namespace {
std::string textoColuna(sqlite3_stmt* stmt, int coluna) {
    const auto* valor = sqlite3_column_text(stmt, coluna);
    return valor ? reinterpret_cast<const char*>(valor) : "";
}

// Executa SQL sem parametros (BEGIN/COMMIT); contexto prefixa a mensagem de erro.
void executarSql(sqlite3* db, const char* sql, const char* contexto) {
    char* erro = nullptr;
    if (sqlite3_exec(db, sql, nullptr, nullptr, &erro) != SQLITE_OK) {
        const std::string mensagem = erro ? erro : sqlite3_errmsg(db);
        sqlite3_free(erro);
        throw std::runtime_error(std::string(contexto) + mensagem);
    }
}

// Grava os horarios semanais reaproveitando o mesmo statement preparado.
// Deve rodar dentro da transacao de quem chama.
void inserirHorarios(sqlite3* db, int idReserva, const std::vector<Horario>& horarios) {
    const char* sql =
        "INSERT INTO reserva_horarios (id_reserva, dia_semana, hora_inicio_min, hora_fim_min) "
        "VALUES (?, ?, ?, ?);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar insert de horario: ") + sqlite3_errmsg(db));
    }

    for (const auto& horario : horarios) {
        sqlite3_bind_int(stmt, 1, idReserva);
        sqlite3_bind_text(stmt, 2, toString(horario.getDiaSemana()), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 3, horario.getHoraInicioMin());
        sqlite3_bind_int(stmt, 4, horario.getHoraFimMin());
        if (sqlite3_step(stmt) != SQLITE_DONE) {
            const std::string mensagem = sqlite3_errmsg(db);
            sqlite3_finalize(stmt);
            throw std::runtime_error("Erro ao inserir horario de reserva: " + mensagem);
        }
        sqlite3_reset(stmt);
        sqlite3_clear_bindings(stmt);
    }
    sqlite3_finalize(stmt);
}
}

void RepositorioReserva::salvar(std::shared_ptr<Reserva> obj) {
    if (!obj || !obj->getSolicitante() || !obj->getEspaco()) {
        throw std::invalid_argument("Reserva, solicitante e espaco sao obrigatorios.");
    }

    const char* sql =
           "INSERT INTO reservas (data_inicio, data_fim, status, id_professor, id_espaco, criada_em, motivo) "
           "VALUES (?, ?, ?, ?, ?, ?, ?);";

    // IMMEDIATE reserva a escrita ja no inicio; se algo falhar, o catch desfaz tudo.
    executarSql(db, "BEGIN IMMEDIATE TRANSACTION;", "Erro ao iniciar transacao de reserva: ");
    sqlite3_stmt* stmt = nullptr;
    try {
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            throw std::runtime_error(std::string("Erro ao preparar insert de reserva: ") + sqlite3_errmsg(db));
        }

        sqlite3_bind_text(stmt, 1, obj->getDataInicio().c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, obj->getDataFim().c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, toString(obj->getStatus()), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 4, obj->getSolicitante()->getId());
        sqlite3_bind_int(stmt, 5, obj->getEspaco()->getId());
        sqlite3_bind_text(stmt, 6, obj->getCriadaEm().c_str(), -1, SQLITE_TRANSIENT);
        if (obj->getMotivo().empty()) sqlite3_bind_null(stmt, 7);
        else sqlite3_bind_text(stmt, 7, obj->getMotivo().c_str(), -1, SQLITE_TRANSIENT);

        if (sqlite3_step(stmt) != SQLITE_DONE) {
            throw std::runtime_error(std::string("Erro ao inserir reserva: ") + sqlite3_errmsg(db));
        }
        obj->setId(static_cast<int>(sqlite3_last_insert_rowid(db)));
        sqlite3_finalize(stmt);
        stmt = nullptr;

        // A reserva e seus horarios precisam ser gravados juntos.
        inserirHorarios(db, obj->getId(), obj->getHorarios());
        executarSql(db, "COMMIT;", "Erro ao confirmar reserva: ");
    } catch (...) {
        if (stmt) sqlite3_finalize(stmt);
        sqlite3_exec(db, "ROLLBACK;", nullptr, nullptr, nullptr);
        throw;
    }
}

std::shared_ptr<Reserva> RepositorioReserva::buscar(int id) {
    const char* sql =
        "SELECT id, data_inicio, data_fim, status, id_professor, id_espaco, criada_em, motivo "
        "FROM reservas WHERE id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar busca de reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, id);

    std::shared_ptr<Reserva> resultado;
    const int status = sqlite3_step(stmt);
    if (status == SQLITE_ROW) {
        resultado = mapearLinha(stmt);
    } else if (status != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao buscar reserva: " + mensagem);
    }
    sqlite3_finalize(stmt);
    return resultado;
}

std::vector<Horario> RepositorioReserva::listarHorarios(int idReserva) const {
    const char* sql =
        "SELECT dia_semana, hora_inicio_min, hora_fim_min FROM reserva_horarios "
        "WHERE id_reserva = ? ORDER BY id;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar busca de horarios: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, idReserva);

    std::vector<Horario> horarios;
    int status;
    while ((status = sqlite3_step(stmt)) == SQLITE_ROW) {
        horarios.emplace_back(
            diaSemanaFromString(textoColuna(stmt, 0)),
            sqlite3_column_int(stmt, 1),
            sqlite3_column_int(stmt, 2));
    }
    if (status != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao listar horarios: " + mensagem);
    }
    sqlite3_finalize(stmt);
    return horarios;
}

std::shared_ptr<Reserva> RepositorioReserva::mapearLinha(sqlite3_stmt* stmt) const {
    const int id = sqlite3_column_int(stmt, 0);
    const int idProfessor = sqlite3_column_int(stmt, 4);
    const int idEspaco = sqlite3_column_int(stmt, 5);

    const char* sqlProfessor =
        "SELECT id, nome, email, senha_hash, departamento FROM usuarios "
        "WHERE id = ? AND tipo = 'PROFESSOR';";
    sqlite3_stmt* stmtProfessor = nullptr;
    if (sqlite3_prepare_v2(db, sqlProfessor, -1, &stmtProfessor, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar busca de professor: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmtProfessor, 1, idProfessor);
    if (sqlite3_step(stmtProfessor) != SQLITE_ROW) {
        sqlite3_finalize(stmtProfessor);
        throw std::runtime_error("Professor da reserva nao encontrado.");
    }
    // Reserva guarda referencias ao professor e ao espaco, resolvidas pelos ids do banco.
    auto professor = std::make_shared<Professor>(
        sqlite3_column_int(stmtProfessor, 0), textoColuna(stmtProfessor, 1),
        textoColuna(stmtProfessor, 2), textoColuna(stmtProfessor, 3),
        textoColuna(stmtProfessor, 4));
    sqlite3_finalize(stmtProfessor);

    auto espaco = repoEspaco->buscar(idEspaco);
    if (!espaco) {
        throw std::runtime_error("Espaco da reserva nao encontrado.");
    }

    auto reserva = std::make_shared<Reserva>(
        id, textoColuna(stmt, 1), textoColuna(stmt, 2), professor,
        espaco, listarHorarios(id));
    reserva->setStatus(statusReservaFromString(textoColuna(stmt, 3)));
    reserva->setCriadaEm(textoColuna(stmt, 6));
    reserva->setMotivo(textoColuna(stmt, 7));
    return reserva;
}

void RepositorioReserva::atualizar(std::shared_ptr<Reserva> obj) {
    const char* sql = "UPDATE reservas SET status = ?, motivo = ? WHERE id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar update de reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_text(stmt, 1, toString(obj->getStatus()), -1, SQLITE_TRANSIENT);
    if (obj->getMotivo().empty()) sqlite3_bind_null(stmt, 2);
    else sqlite3_bind_text(stmt, 2, obj->getMotivo().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 3, obj->getId());
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao atualizar reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_finalize(stmt);
}

// A condicao "AND status = PENDENTE" fica no proprio UPDATE: se dois admins decidirem
// ao mesmo tempo, so um altera a linha. sqlite3_changes diz se houve alteracao.
bool RepositorioReserva::atualizarStatusPendente(int id, StatusReserva status, const std::string& motivo) {
    if (status != StatusReserva::APROVADA && status != StatusReserva::REJEITADA) {
        return false;
    }

    const char* sql = "UPDATE reservas SET status = ?, motivo = ? WHERE id = ? AND status = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar update de status da reserva: ") + sqlite3_errmsg(db));
    }

    sqlite3_bind_text(stmt, 1, toString(status), -1, SQLITE_TRANSIENT);
    if (motivo.empty()) sqlite3_bind_null(stmt, 2);
    else sqlite3_bind_text(stmt, 2, motivo.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 3, id);
    sqlite3_bind_text(stmt, 4, toString(StatusReserva::PENDENTE), -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao atualizar status da reserva: ") + sqlite3_errmsg(db));
    }

    const bool atualizado = sqlite3_changes(db) == 1;
    sqlite3_finalize(stmt);
    return atualizado;
}

// Mesma ideia: dono, status e data sao conferidos no WHERE, de forma atomica.
bool RepositorioReserva::cancelarReserva(int id, int idProfessor, const std::string& hoje,
                                          const std::string& motivo) {
    const char* sql =
        "UPDATE reservas SET status = ?, motivo = ? WHERE id = ? AND id_professor = ? "
        "AND status IN (?, ?) AND data_fim >= ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar cancelamento de reserva: ") + sqlite3_errmsg(db));
    }

    sqlite3_bind_text(stmt, 1, toString(StatusReserva::CANCELADA), -1, SQLITE_TRANSIENT);
    if (motivo.empty()) sqlite3_bind_null(stmt, 2);
    else sqlite3_bind_text(stmt, 2, motivo.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 3, id);
    sqlite3_bind_int(stmt, 4, idProfessor);
    sqlite3_bind_text(stmt, 5, toString(StatusReserva::PENDENTE), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, toString(StatusReserva::APROVADA), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, hoje.c_str(), -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao cancelar reserva: ") + sqlite3_errmsg(db));
    }

    const bool cancelada = sqlite3_changes(db) == 1;
    sqlite3_finalize(stmt);
    return cancelada;
}

void RepositorioReserva::remover(int id) {
    const char* sql = "DELETE FROM reservas WHERE id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar delete de reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, id);
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao remover reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_finalize(stmt);
}

std::vector<std::shared_ptr<Reserva>> RepositorioReserva::listarTodos() {
    const char* sql =
        "SELECT id, data_inicio, data_fim, status, id_professor, id_espaco, criada_em, motivo "
        "FROM reservas ORDER BY id;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar listagem de reservas: ") + sqlite3_errmsg(db));
    }

    std::vector<std::shared_ptr<Reserva>> resultado;
    int status;
    while ((status = sqlite3_step(stmt)) == SQLITE_ROW) {
        resultado.push_back(mapearLinha(stmt));
    }
    if (status != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao listar reservas: " + mensagem);
    }
    sqlite3_finalize(stmt);
    return resultado;
}

// Datas ISO (AAAA-MM-DD) comparadas como texto ficam na ordem cronologica.
// idReservaIgnorada (se > 0) deixa uma reserva de fora da consulta.
std::vector<std::shared_ptr<Reserva>> RepositorioReserva::listarPorEspacoEData(
        int idEspaco, const std::string& data, int idReservaIgnorada) {
        const char* sql = idReservaIgnorada > 0
            ? "SELECT id, data_inicio, data_fim, status, id_professor, id_espaco, criada_em, motivo "
                    "FROM reservas WHERE id_espaco = ? AND data_inicio <= ? AND data_fim >= ? "
                    "AND id <> ? ORDER BY id;"
                : "SELECT id, data_inicio, data_fim, status, id_professor, id_espaco, criada_em, motivo "
                    "FROM reservas WHERE id_espaco = ? AND data_inicio <= ? AND data_fim >= ? ORDER BY id;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar busca de reservas por espaco/data: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, idEspaco);
    sqlite3_bind_text(stmt, 2, data.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, data.c_str(), -1, SQLITE_TRANSIENT);
    if (idReservaIgnorada > 0) sqlite3_bind_int(stmt, 4, idReservaIgnorada);

    std::vector<std::shared_ptr<Reserva>> resultado;
    int status;
    while ((status = sqlite3_step(stmt)) == SQLITE_ROW) {
        resultado.push_back(mapearLinha(stmt));
    }
    if (status != SQLITE_DONE) {
        const std::string mensagem = sqlite3_errmsg(db);
        sqlite3_finalize(stmt);
        throw std::runtime_error("Erro ao listar reservas por espaco/data: " + mensagem);
    }
    sqlite3_finalize(stmt);
    return resultado;
}
