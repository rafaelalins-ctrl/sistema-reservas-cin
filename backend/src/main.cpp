#include <fstream>
#include <sstream>
#include <sqlite3.h>
#include "crow.h"

#include "services/SistemaDeReservas.hpp"
#include "models/SalaAula.hpp"

// Aplica o schema.sql na conexao (idempotente: usa CREATE TABLE IF NOT EXISTS).
static void aplicarSchema(sqlite3* db, const std::string& caminhoSchema) {
    std::ifstream arquivo(caminhoSchema);
    if (!arquivo) {
        throw std::runtime_error("Nao foi possivel abrir " + caminhoSchema);
    }
    std::ostringstream buffer;
    buffer << arquivo.rdbuf();
    std::string sql = buffer.str();

    char* erro = nullptr;
    if (sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &erro) != SQLITE_OK) {
        std::string msg = erro ? erro : "erro desconhecido";
        sqlite3_free(erro);
        throw std::runtime_error("Erro ao aplicar schema: " + msg);
    }
}

int main() {
    sqlite3* db = nullptr;
    if (sqlite3_open("database/reservas.db", &db) != SQLITE_OK) {
        std::cerr << "Erro ao abrir banco: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }
    aplicarSchema(db, "database/schema.sql");

    SistemaDeReservas sistema(db);

    crow::SimpleApp app;

    // ---------------------------------------------
    // GET /api/espacos - lista todos os espacos
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/espacos").methods(crow::HTTPMethod::GET)
    ([&sistema]() {
        auto espacos = sistema.getRepositorioEspacos().listarTodos();

        crow::json::wvalue resposta;
        std::vector<crow::json::wvalue> lista;
        for (const auto& espaco : espacos) {
            crow::json::wvalue item;
            item["id"] = espaco->getId();
            item["identificacao"] = espaco->getIdentificacao();
            item["capacidade"] = espaco->getCapacidade();
            item["tipo"] = espaco->tipo();
            item["descricao"] = espaco->obterDescricaoDetalhada();
            item["emManutencao"] = espaco->isEmManutencao();
            lista.push_back(std::move(item));
        }
        resposta = std::move(lista);
        return crow::response(resposta);
    });

    // ---------------------------------------------
    // GET /api/espacos/disponiveis?dia=&inicio=&fim=&capacidade=
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/espacos/disponiveis").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto dia = req.url_params.get("dia");
        auto inicio = req.url_params.get("inicio");
        auto fim = req.url_params.get("fim");
        auto capacidade = req.url_params.get("capacidade");

        if (!dia || !inicio || !fim) {
            return crow::response(400, "Parametros 'dia', 'inicio' e 'fim' sao obrigatorios.");
        }

        DiaSemana diaSemana = diaSemanaFromString(dia);
        Horario horario(diaSemana, std::stoi(inicio), std::stoi(fim));
        int capMinima = capacidade ? std::stoi(capacidade) : 0;

        // TODO: receber a data efetiva via query param; usando placeholder por ora.
        auto disponiveis = sistema.listarEspacosDisponiveis(horario, "2026-01-01", capMinima);

        crow::json::wvalue resposta;
        std::vector<crow::json::wvalue> lista;
        for (const auto& espaco : disponiveis) {
            crow::json::wvalue item;
            item["id"] = espaco->getId();
            item["identificacao"] = espaco->getIdentificacao();
            item["capacidade"] = espaco->getCapacidade();
            lista.push_back(std::move(item));
        }
        resposta = std::move(lista);
        return crow::response(resposta);
    });

    // ---------------------------------------------
    // POST /api/reservas - cria uma solicitacao de reserva
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body) {
            return crow::response(400, "JSON invalido.");
        }

        // TODO: montar Reserva a partir do body (idEspaco, idProfessor, horarios[])
        // usando repositorios/servicos de Usuario (ainda nao implementados neste
        // esqueleto) e chamar sistema.processarNovaReserva(...).
        return crow::response(501, "Endpoint ainda nao implementado - ver TODO em main.cpp");
    });

    // ---------------------------------------------
    // POST /api/reservas/:id/aprovar
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas/<int>/aprovar").methods(crow::HTTPMethod::POST)
    ([&sistema](int idReserva) {
        // TODO: validar que quem chama e Administrador (autenticacao) e delegar
        // para sistema.getRepositorioReservas() apos localizar/aprovar a reserva.
        (void)idReserva;
        return crow::response(501, "Endpoint ainda nao implementado - ver TODO em main.cpp");
    });

    app.port(18080).multithreaded().run();

    sqlite3_close(db);
    return 0;
}
