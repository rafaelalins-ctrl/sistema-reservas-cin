#include "repositories/RepositorioEspaco.hpp"
#include "models/SalaAula.hpp"
#include "models/Laboratorio.hpp"
#include "models/Auditorio.hpp"
#include <stdexcept>
#include <sstream>

namespace {
// sqlite3_column_text devolve nullptr para NULL; aqui vira string vazia.
std::string textoColuna(sqlite3_stmt* stmt, int coluna) {
    const auto* valor = sqlite3_column_text(stmt, coluna);
    return valor ? reinterpret_cast<const char*>(valor) : "";
}

std::string juntarSoftwares(const std::vector<std::string>& softwares) {
    std::ostringstream resultado;
    for (std::size_t i = 0; i < softwares.size(); ++i) {
        if (i > 0) resultado << ',';
        resultado << softwares[i];
    }
    return resultado.str();
}

// No banco, os softwares ficam em uma unica coluna separados por virgula.
std::vector<std::string> separarSoftwares(const std::string& softwares) {
    std::vector<std::string> resultado;
    std::istringstream entrada(softwares);
    std::string software;
    while (std::getline(entrada, software, ',')) {
        resultado.push_back(software);
    }
    return resultado;
}
}

// Tabela unica para os tres subtipos: a coluna tipo diz qual classe recriar
// e as colunas especificas dos outros subtipos ficam NULL.
void RepositorioEspaco::salvar(std::shared_ptr<Espaco> obj) {
    if (!obj) throw std::invalid_argument("Espaco nao pode ser nulo.");

    const char* sql =
        "INSERT INTO espacos (identificacao, capacidade, bloco, mobilia, qtd_tomadas, "
        "acessivel_cadeirante, requer_retirada_chave, em_manutencao, tipo, tipo_quadro, "
        "possui_projetor, qtd_computadores, softwares_instalados, equipamento_som, cabine_traducao) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

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
    // tipo() e virtual: cada subclasse informa o proprio valor.
    sqlite3_bind_text(stmt, 9, obj->tipo().c_str(), -1, SQLITE_TRANSIENT);

    // dynamic_pointer_cast devolve nullptr se o objeto nao for daquele subtipo.
    // Cada subtipo preenche seus campos e deixa os campos dos outros tipos nulos.
    if (auto sala = std::dynamic_pointer_cast<SalaAula>(obj)) {
        sqlite3_bind_text(stmt, 10, toString(sala->getTipoQuadro()), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 11, sala->isPossuiProjetor());
        sqlite3_bind_null(stmt, 12);
        sqlite3_bind_null(stmt, 13);
        sqlite3_bind_null(stmt, 14);
        sqlite3_bind_null(stmt, 15);
    } else if (auto laboratorio = std::dynamic_pointer_cast<Laboratorio>(obj)) {
        sqlite3_bind_null(stmt, 10);
        sqlite3_bind_null(stmt, 11);
        sqlite3_bind_int(stmt, 12, laboratorio->getQtdComputadores());
        const std::string softwares = juntarSoftwares(laboratorio->getSoftwaresInstalados());
        sqlite3_bind_text(stmt, 13, softwares.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_null(stmt, 14);
        sqlite3_bind_null(stmt, 15);
    } else if (auto auditorio = std::dynamic_pointer_cast<Auditorio>(obj)) {
        sqlite3_bind_null(stmt, 10);
        sqlite3_bind_null(stmt, 11);
        sqlite3_bind_null(stmt, 12);
        sqlite3_bind_null(stmt, 13);
        sqlite3_bind_int(stmt, 14, auditorio->isEquipamentoSom());
        sqlite3_bind_int(stmt, 15, auditorio->isCabineTraducao());
    } else {
        sqlite3_finalize(stmt);
        throw std::invalid_argument("Tipo concreto de espaco nao suportado.");
    }

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw std::runtime_error(std::string("Erro ao inserir espaco: ") + sqlite3_errmsg(db));
    }

    obj->setId(static_cast<int>(sqlite3_last_insert_rowid(db)));
    sqlite3_finalize(stmt);

}

std::shared_ptr<Espaco> RepositorioEspaco::mapearLinha(sqlite3_stmt* stmt) const {
    int id = sqlite3_column_int(stmt, 0);
    std::string identificacao = textoColuna(stmt, 1);
    int capacidade = sqlite3_column_int(stmt, 2);
    BlocoCIn bloco = blocoFromString(textoColuna(stmt, 3));
    TipoMobilia mobilia = tipoMobiliaFromString(textoColuna(stmt, 4));
    int qtdTomadas = sqlite3_column_int(stmt, 5);
    bool acessivel = sqlite3_column_int(stmt, 6) != 0;
    bool requerChave = sqlite3_column_int(stmt, 7) != 0;
    bool manutencao = sqlite3_column_int(stmt, 8) != 0;
    std::string tipo = textoColuna(stmt, 9);

    // Fabrica: cria o objeto concreto certo e o devolve como shared_ptr<Espaco>.
    if (tipo == "SALA_AULA") {
        const auto tipoQuadro = sqlite3_column_type(stmt, 10) == SQLITE_NULL
            ? TipoQuadro::BRANCO : tipoQuadroFromString(textoColuna(stmt, 10));
        const bool possuiProjetor = sqlite3_column_int(stmt, 11) != 0;
        return std::make_shared<SalaAula>(id, identificacao, capacidade, bloco, mobilia,
                                           qtdTomadas, acessivel, requerChave, manutencao,
                                           tipoQuadro, possuiProjetor);
    }
    if (tipo == "LABORATORIO") {
        const int qtdComputadores = sqlite3_column_int(stmt, 12);
        const auto softwares = separarSoftwares(textoColuna(stmt, 13));
        return std::make_shared<Laboratorio>(id, identificacao, capacidade, bloco, mobilia,
                                              qtdTomadas, acessivel, requerChave, manutencao,
                                              qtdComputadores, softwares);
    }
    if (tipo == "AUDITORIO") {
        const bool equipamentoSom = sqlite3_column_int(stmt, 14) != 0;
        const bool cabineTraducao = sqlite3_column_int(stmt, 15) != 0;
        return std::make_shared<Auditorio>(id, identificacao, capacidade, bloco, mobilia,
                                            qtdTomadas, acessivel, requerChave, manutencao,
                                            equipamentoSom, cabineTraducao);
    }
    throw std::runtime_error("Tipo de espaco desconhecido no banco: " + tipo);
}

std::shared_ptr<Espaco> RepositorioEspaco::buscar(int id) {
    const char* sql =
        "SELECT id, identificacao, capacidade, bloco, mobilia, qtd_tomadas, "
        "acessivel_cadeirante, requer_retirada_chave, em_manutencao, tipo, tipo_quadro, "
        "possui_projetor, qtd_computadores, softwares_instalados, equipamento_som, cabine_traducao "
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
    if (!obj) throw std::invalid_argument("Espaco nao pode ser nulo.");

    const char* sql =
        "UPDATE espacos SET identificacao=?, capacidade=?, bloco=?, mobilia=?, "
        "qtd_tomadas=?, acessivel_cadeirante=?, requer_retirada_chave=?, em_manutencao=?, "
        "tipo=?, tipo_quadro=?, possui_projetor=?, qtd_computadores=?, softwares_instalados=?, "
        "equipamento_som=?, cabine_traducao=? WHERE id=?;";

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
    sqlite3_bind_text(stmt, 9, obj->tipo().c_str(), -1, SQLITE_TRANSIENT);
    // Mantem no banco apenas os atributos que pertencem ao subtipo do espaco.
    if (auto sala = std::dynamic_pointer_cast<SalaAula>(obj)) {
        sqlite3_bind_text(stmt, 10, toString(sala->getTipoQuadro()), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 11, sala->isPossuiProjetor());
        sqlite3_bind_null(stmt, 12);
        sqlite3_bind_null(stmt, 13);
        sqlite3_bind_null(stmt, 14);
        sqlite3_bind_null(stmt, 15);
    } else if (auto laboratorio = std::dynamic_pointer_cast<Laboratorio>(obj)) {
        sqlite3_bind_null(stmt, 10);
        sqlite3_bind_null(stmt, 11);
        sqlite3_bind_int(stmt, 12, laboratorio->getQtdComputadores());
        const std::string softwares = juntarSoftwares(laboratorio->getSoftwaresInstalados());
        sqlite3_bind_text(stmt, 13, softwares.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_null(stmt, 14);
        sqlite3_bind_null(stmt, 15);
    } else if (auto auditorio = std::dynamic_pointer_cast<Auditorio>(obj)) {
        sqlite3_bind_null(stmt, 10);
        sqlite3_bind_null(stmt, 11);
        sqlite3_bind_null(stmt, 12);
        sqlite3_bind_null(stmt, 13);
        sqlite3_bind_int(stmt, 14, auditorio->isEquipamentoSom());
        sqlite3_bind_int(stmt, 15, auditorio->isCabineTraducao());
    } else {
        sqlite3_finalize(stmt);
        throw std::invalid_argument("Tipo concreto de espaco nao suportado.");
    }
    sqlite3_bind_int(stmt, 16, obj->getId());

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
        "acessivel_cadeirante, requer_retirada_chave, em_manutencao, tipo, tipo_quadro, "
        "possui_projetor, qtd_computadores, softwares_instalados, equipamento_som, cabine_traducao "
        "FROM espacos;";

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
