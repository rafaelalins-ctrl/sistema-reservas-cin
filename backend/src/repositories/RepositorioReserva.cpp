#include "repositories/RepositorioReserva.hpp"
#include "models/Professor.hpp"
#include <stdexcept>

// NOTE: esqueleto de referencia. A tabela 'reservas' guarda o cabecalho da
// reserva; os Horario (1..*) ficam em 'reserva_horarios' (ver schema.sql) e
// precisam de uma query auxiliar para montar o vector<Horario> completo.
// O solicitante (Professor) tambem precisaria de um RepositorioUsuario
// dedicado para ser totalmente reidratado a partir do banco — aqui deixamos
// apenas o id resolvido, como ponto de partida.

void RepositorioReserva::salvar(std::shared_ptr<Reserva> obj) {
    const char* sql =
        "INSERT INTO reservas (data_inicio, data_fim, status, id_professor, id_espaco) "
        "VALUES (?, ?, ?, ?, ?);";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar insert de reserva: ") + sqlite3_errmsg(db));
    }

    sqlite3_bind_text(stmt, 1, obj->getDataInicio().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, obj->getDataFim().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, toString(obj->getStatus()), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 4, obj->getSolicitante() ? obj->getSolicitante()->getId() : 0);
    sqlite3_bind_int(stmt, 5, obj->getEspaco() ? obj->getEspaco()->getId() : 0);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao inserir reserva: ") + sqlite3_errmsg(db));
    }
    obj->setId(static_cast<int>(sqlite3_last_insert_rowid(db)));
    sqlite3_finalize(stmt);

    const char* horarioSql =
        "INSERT INTO reserva_horarios (id_reserva, dia_semana, hora_inicio_min, hora_fim_min) "
        "VALUES (?, ?, ?, ?);";
    for (const auto& horario : obj->getHorarios()) {
        sqlite3_stmt* horarioStmt = nullptr;
        if (sqlite3_prepare_v2(db, horarioSql, -1, &horarioStmt, nullptr) != SQLITE_OK) {
            throw std::runtime_error(std::string("Erro ao preparar horario: ") + sqlite3_errmsg(db));
        }
        sqlite3_bind_int(horarioStmt, 1, obj->getId());
        sqlite3_bind_text(horarioStmt, 2, toString(horario.getDiaSemana()), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(horarioStmt, 3, horario.getHoraInicioMin());
        sqlite3_bind_int(horarioStmt, 4, horario.getHoraFimMin());
        if (sqlite3_step(horarioStmt) != SQLITE_DONE) {
            sqlite3_finalize(horarioStmt);
            throw std::runtime_error(std::string("Erro ao inserir horario: ") + sqlite3_errmsg(db));
        }
        sqlite3_finalize(horarioStmt);
    }
}

std::shared_ptr<Reserva> RepositorioReserva::buscar(int id) {
    const char* sql =
        "SELECT r.id, r.data_inicio, r.data_fim, r.status, r.id_professor, "
        "u.nome, u.email, u.senha_hash, u.departamento, r.id_espaco "
        "FROM reservas r JOIN usuarios u ON u.id = r.id_professor WHERE r.id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar select de reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, id);
    if (sqlite3_step(stmt) != SQLITE_ROW) { sqlite3_finalize(stmt); return nullptr; }
    int reservaId = sqlite3_column_int(stmt, 0);
    std::string dataInicio = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
    std::string dataFim = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
    std::string status = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
    int professorId = sqlite3_column_int(stmt, 4);
    auto professor = std::make_shared<Professor>(professorId,
        reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5)),
        reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6)),
        reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7)),
        reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8)));
    auto espaco = repoEspaco->buscar(sqlite3_column_int(stmt, 9));
    sqlite3_finalize(stmt);
    if (!espaco) return nullptr;

    std::vector<Horario> horarios;
    const char* horarioSql = "SELECT dia_semana, hora_inicio_min, hora_fim_min FROM reserva_horarios WHERE id_reserva = ?;";
    if (sqlite3_prepare_v2(db, horarioSql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar horarios: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, reservaId);
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        horarios.emplace_back(diaSemanaFromString(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0))),
                              sqlite3_column_int(stmt, 1), sqlite3_column_int(stmt, 2));
    }
    sqlite3_finalize(stmt);
    auto reserva = std::make_shared<Reserva>(reservaId, dataInicio, dataFim, professor, espaco, horarios);
    reserva->setStatus(statusReservaFromString(status));
    return reserva;
}

void RepositorioReserva::atualizar(std::shared_ptr<Reserva> obj) {
    const char* sql = "UPDATE reservas SET status = ? WHERE id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar update de reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_text(stmt, 1, toString(obj->getStatus()), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, obj->getId());
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao atualizar reserva: ") + sqlite3_errmsg(db));
    }
    sqlite3_finalize(stmt);
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
    std::vector<std::shared_ptr<Reserva>> resultado;
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, "SELECT id FROM reservas ORDER BY data_inicio;", -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao listar reservas: ") + sqlite3_errmsg(db));
    }
    while (sqlite3_step(stmt) == SQLITE_ROW) resultado.push_back(buscar(sqlite3_column_int(stmt, 0)));
    sqlite3_finalize(stmt);
    return resultado;
}

std::vector<std::shared_ptr<Reserva>> RepositorioReserva::listarPorEspacoEData(
    int idEspaco, const std::string& data) {
    std::vector<std::shared_ptr<Reserva>> resultado;
    const char* sql = "SELECT id FROM reservas WHERE id_espaco = ? AND data_inicio <= ? AND data_fim >= ? AND status IN ('PENDENTE', 'APROVADA');";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao buscar conflitos: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, idEspaco);
    sqlite3_bind_text(stmt, 2, data.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, data.c_str(), -1, SQLITE_TRANSIENT);
    while (sqlite3_step(stmt) == SQLITE_ROW) resultado.push_back(buscar(sqlite3_column_int(stmt, 0)));
    sqlite3_finalize(stmt);
    return resultado;
}
