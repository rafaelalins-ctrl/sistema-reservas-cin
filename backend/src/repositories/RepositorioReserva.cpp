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

    // TODO: inserir cada Horario de obj->getHorarios() em 'reserva_horarios'.
}

std::shared_ptr<Reserva> RepositorioReserva::buscar(int id) {
    // TODO: SELECT em 'reservas' + join/lookup em 'reserva_horarios' e no
    // repoEspaco para montar o objeto Reserva completo.
    (void)id;
    return nullptr;
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
    // TODO: implementar seguindo o mesmo padrao de RepositorioEspaco::listarTodos,
    // reidratando Horario e Professor/Espaco associados.
    return {};
}

std::vector<std::shared_ptr<Reserva>> RepositorioReserva::listarPorEspacoEData(
    int idEspaco, const std::string& data) {
    // TODO: usado por SistemaDeReservas::verificarDisponibilidade para checar
    // conflitos de Horario num dado Espaco/data.
    (void)idEspaco;
    (void)data;
    return {};
}
