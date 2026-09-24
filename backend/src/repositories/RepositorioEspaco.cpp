#include "repositories/RepositorioEspaco.hpp"
#include "models/SalaAula.hpp"
#include "models/Laboratorio.hpp"
#include "models/Auditorio.hpp"
#include <stdexcept>
#include <iostream>

// NOTE: implementacao de referencia/esqueleto. Os campos especificos de cada
// subtipo (ex: qtdComputadores, softwaresInstalados) sao persistidos em
// colunas nullable na mesma tabela 'espacos' (ver database/schema.sql) para
// manter o exemplo simples; em um projeto maior, prefira tabelas separadas
// (Table-per-subclass) ou uma coluna JSON para os atributos especificos.

void RepositorioEspaco::salvar(std::shared_ptr<Espaco> obj) {
    const char* sql =
        "INSERT INTO espacos (identificacao, capacidade, bloco, mobilia, qtd_tomadas, "
        "acessivel_cadeirante, requer_retirada_chave, em_manutencao, tipo) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar insert de espaco: ") + sqlite3_errmsg(db));
    }

    sqlite3_bind_text(stmt, 1, obj->getIdentificacao().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, obj->getCapacidade());
    sqlite3_bind_text(stmt, 3, toString(obj->getBloco()), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, toString(obj->getMobilia()), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 5, obj->getQtdTomadas());
    sqlite3_bind_int(stmt, 6, obj->isAcessivelCadeirante());
    sqlite3_bind_int(stmt, 7, obj->isRequerRetiradaChave());
    sqlite3_bind_int(stmt, 8, obj->isEmManutencao());
    sqlite3_bind_text(stmt, 9, obj->tipo().c_str(), -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao inserir espaco: ") + sqlite3_errmsg(db));
    }

    obj->setId(static_cast<int>(sqlite3_last_insert_rowid(db)));
    sqlite3_finalize(stmt);

    // TODO: persistir campos especificos do subtipo (qtdComputadores, tipoQuadro, etc).
}

std::shared_ptr<Espaco> RepositorioEspaco::mapearLinha(sqlite3_stmt* stmt) const {
    int id = sqlite3_column_int(stmt, 0);
    std::string identificacao = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
    int capacidade = sqlite3_column_int(stmt, 2);
    BlocoCIn bloco = blocoFromString(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)));
    TipoMobilia mobilia = tipoMobiliaFromString(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4)));
    int qtdTomadas = sqlite3_column_int(stmt, 5);
    bool acessivel = sqlite3_column_int(stmt, 6) != 0;
    bool requerChave = sqlite3_column_int(stmt, 7) != 0;
    bool manutencao = sqlite3_column_int(stmt, 8) != 0;
    std::string tipo = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9));

    // TODO: ler colunas especificas de cada subtipo e repassar aos construtores abaixo.
    if (tipo == "SALA_AULA") {
        return std::make_shared<SalaAula>(id, identificacao, capacidade, bloco, mobilia,
                                           qtdTomadas, acessivel, requerChave, manutencao,
                                           TipoQuadro::BRANCO, false);
    }
    if (tipo == "LABORATORIO") {
        return std::make_shared<Laboratorio>(id, identificacao, capacidade, bloco, mobilia,
                                              qtdTomadas, acessivel, requerChave, manutencao,
                                              0, std::vector<std::string>{});
    }
    if (tipo == "AUDITORIO") {
        return std::make_shared<Auditorio>(id, identificacao, capacidade, bloco, mobilia,
                                            qtdTomadas, acessivel, requerChave, manutencao,
                                            false, false);
    }
    throw std::runtime_error("Tipo de espaco desconhecido no banco: " + tipo);
}

std::shared_ptr<Espaco> RepositorioEspaco::buscar(int id) {
    const char* sql =
        "SELECT id, identificacao, capacidade, bloco, mobilia, qtd_tomadas, "
        "acessivel_cadeirante, requer_retirada_chave, em_manutencao, tipo "
        "FROM espacos WHERE id = ?;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar select de espaco: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, id);

    std::shared_ptr<Espaco> resultado = nullptr;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        resultado = mapearLinha(stmt);
    }
    sqlite3_finalize(stmt);
    return resultado;
}

void RepositorioEspaco::atualizar(std::shared_ptr<Espaco> obj) {
    const char* sql =
        "UPDATE espacos SET identificacao=?, capacidade=?, bloco=?, mobilia=?, "
        "qtd_tomadas=?, acessivel_cadeirante=?, requer_retirada_chave=?, em_manutencao=? "
        "WHERE id=?;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar update de espaco: ") + sqlite3_errmsg(db));
    }

    sqlite3_bind_text(stmt, 1, obj->getIdentificacao().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, obj->getCapacidade());
    sqlite3_bind_text(stmt, 3, toString(obj->getBloco()), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, toString(obj->getMobilia()), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 5, obj->getQtdTomadas());
    sqlite3_bind_int(stmt, 6, obj->isAcessivelCadeirante());
    sqlite3_bind_int(stmt, 7, obj->isRequerRetiradaChave());
    sqlite3_bind_int(stmt, 8, obj->isEmManutencao());
    sqlite3_bind_int(stmt, 9, obj->getId());

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao atualizar espaco: ") + sqlite3_errmsg(db));
    }
    sqlite3_finalize(stmt);
}

void RepositorioEspaco::remover(int id) {
    const char* sql = "DELETE FROM espacos WHERE id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar delete de espaco: ") + sqlite3_errmsg(db));
    }
    sqlite3_bind_int(stmt, 1, id);
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao remover espaco: ") + sqlite3_errmsg(db));
    }
    sqlite3_finalize(stmt);
}

std::vector<std::shared_ptr<Espaco>> RepositorioEspaco::listarTodos() {
    const char* sql =
        "SELECT id, identificacao, capacidade, bloco, mobilia, qtd_tomadas, "
        "acessivel_cadeirante, requer_retirada_chave, em_manutencao, tipo FROM espacos;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar listagem de espacos: ") + sqlite3_errmsg(db));
    }

    std::vector<std::shared_ptr<Espaco>> resultado;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        resultado.push_back(mapearLinha(stmt));
    }
    sqlite3_finalize(stmt);
    return resultado;
}
