#include <fstream>
#include <ctime>
#include <iomanip>
#include <limits>
#include <optional>
#include <string>
#include <sstream>
#include <utility>
#include <sqlite3.h>
#include "crow.h"

#include "services/SistemaDeReservas.hpp"
#include "models/Administrador.hpp"
#include "models/Professor.hpp"

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

static DiaSemana diaDaData(const std::string& data) {
    std::tm dataSeparada{};
    std::istringstream entrada(data);
    entrada >> std::get_time(&dataSeparada, "%Y-%m-%d");
    if (entrada.fail() || entrada.peek() != std::char_traits<char>::eof()) {
        throw std::invalid_argument("Data deve usar o formato AAAA-MM-DD.");
    }

    dataSeparada.tm_hour = 12;
    dataSeparada.tm_isdst = -1;
    if (std::mktime(&dataSeparada) == -1) {
        throw std::invalid_argument("Data invalida.");
    }

    char dataNormalizada[11];
    std::strftime(dataNormalizada, sizeof(dataNormalizada), "%Y-%m-%d", &dataSeparada);
    if (data != dataNormalizada) {
        throw std::invalid_argument("Data invalida.");
    }

    return static_cast<DiaSemana>((dataSeparada.tm_wday + 6) % 7);
}

static std::optional<std::pair<std::string, std::string>> decodificarBasic(const std::string& cabecalho) {
    constexpr std::string_view prefixo = "Basic ";
    if (cabecalho.compare(0, prefixo.size(), prefixo) != 0) return std::nullopt;
    const std::string codificado = cabecalho.substr(prefixo.size());
    if (codificado.empty() || codificado.size() % 4 != 0) return std::nullopt;

    const auto valorBase64 = [](char caractere) -> int {
        if (caractere >= 'A' && caractere <= 'Z') return caractere - 'A';
        if (caractere >= 'a' && caractere <= 'z') return caractere - 'a' + 26;
        if (caractere >= '0' && caractere <= '9') return caractere - '0' + 52;
        if (caractere == '+') return 62;
        if (caractere == '/') return 63;
        return -1;
    };

    std::string decodificado;
    for (std::size_t i = 0; i < codificado.size(); i += 4) {
        const int a = valorBase64(codificado[i]);
        const int b = valorBase64(codificado[i + 1]);
        const bool ultimoGrupo = i + 4 == codificado.size();
        if (a < 0 || b < 0) return std::nullopt;
        decodificado.push_back(static_cast<char>((a << 2) | (b >> 4)));

        if (codificado[i + 2] == '=') {
            if (!ultimoGrupo || codificado[i + 3] != '=') return std::nullopt;
            continue;
        }
        const int c = valorBase64(codificado[i + 2]);
        if (c < 0) return std::nullopt;
        decodificado.push_back(static_cast<char>(((b & 0x0f) << 4) | (c >> 2)));

        if (codificado[i + 3] == '=') {
            if (!ultimoGrupo) return std::nullopt;
            continue;
        }
        const int d = valorBase64(codificado[i + 3]);
        if (d < 0) return std::nullopt;
        decodificado.push_back(static_cast<char>(((c & 0x03) << 6) | d));
    }

    const auto separador = decodificado.find(':');
    if (separador == std::string::npos || separador == 0) return std::nullopt;
    return std::make_pair(decodificado.substr(0, separador), decodificado.substr(separador + 1));
}

static std::shared_ptr<Usuario> autenticar(const crow::request& req, SistemaDeReservas& sistema) {
    const auto credenciais = decodificarBasic(req.get_header_value("Authorization"));
    if (!credenciais) return nullptr;
    return sistema.autenticarUsuario(credenciais->first, credenciais->second);
}

static crow::response respostaNaoAutorizada() {
    crow::response resposta(401, "Autenticacao necessaria.");
    resposta.set_header("WWW-Authenticate", "Basic realm=\"Sistema de Reservas\", charset=\"UTF-8\"");
    return resposta;
}

static void responderJson(crow::response& resposta, int status, const std::string& mensagem) {
    crow::json::wvalue corpo;
    corpo["mensagem"] = mensagem;
    resposta.code = status;
    resposta.set_header("Content-Type", "application/json; charset=utf-8");
    resposta.body = corpo.dump();
    resposta.end();
}

int main() {
    sqlite3* db = nullptr;
    if (sqlite3_open("database/reservas.db", &db) != SQLITE_OK) {
        std::cerr << "Erro ao abrir banco: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }
    aplicarSchema(db, "database/schema.sql");

    sqlite3* catalogoDb = nullptr;
    if (sqlite3_open_v2("database/cin_2026.db", &catalogoDb, SQLITE_OPEN_READONLY, nullptr) != SQLITE_OK) {
        std::cerr << "Erro ao abrir catalogo CIn: " << sqlite3_errmsg(catalogoDb) << std::endl;
        sqlite3_close(catalogoDb);
        sqlite3_close(db);
        return 1;
    }

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
        crow::json::wvalue corpo = std::move(resposta);
        return crow::response(corpo);
    });

    CROW_ROUTE(app, "/api/catalogo/espacos").methods(crow::HTTPMethod::GET)
    ([catalogoDb]() {
        const char* sql =
            "SELECT id, codigo, nome, tipo, bloco, andar, observacao "
            "FROM espacos ORDER BY bloco, codigo, nome;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(catalogoDb, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            return crow::response(500, sqlite3_errmsg(catalogoDb));
        }

        crow::json::wvalue resposta;
        std::vector<crow::json::wvalue> lista;
        int resultado = SQLITE_OK;
        while ((resultado = sqlite3_step(stmt)) == SQLITE_ROW) {
            const auto texto = [stmt](int coluna) {
                const auto* valor = sqlite3_column_text(stmt, coluna);
                return valor ? reinterpret_cast<const char*>(valor) : "";
            };
            crow::json::wvalue item;
            item["id"] = sqlite3_column_int(stmt, 0);
            if (sqlite3_column_type(stmt, 1) == SQLITE_NULL) item["codigo"] = nullptr;
            else item["codigo"] = texto(1);
            item["nome"] = texto(2);
            item["tipo"] = texto(3);
            if (sqlite3_column_type(stmt, 4) == SQLITE_NULL) item["bloco"] = nullptr;
            else item["bloco"] = texto(4);
            if (sqlite3_column_type(stmt, 5) == SQLITE_NULL) item["andar"] = nullptr;
            else item["andar"] = sqlite3_column_int(stmt, 5);
            if (sqlite3_column_type(stmt, 6) == SQLITE_NULL) item["observacao"] = nullptr;
            else item["observacao"] = texto(6);
            lista.push_back(std::move(item));
        }
        sqlite3_finalize(stmt);
        if (resultado != SQLITE_DONE) return crow::response(500, sqlite3_errmsg(catalogoDb));

        resposta = std::move(lista);
        return crow::response(resposta);
    });

    CROW_ROUTE(app, "/api/catalogo/espacos/<int>/agenda").methods(crow::HTTPMethod::GET)
    ([catalogoDb, db](const crow::request& req, int idEspaco) {
        const char* parametroData = req.url_params.get("data");
        if (!parametroData) return crow::response(400, "Informe a data no formato AAAA-MM-DD.");

        const std::string data(parametroData);
        DiaSemana dia;
        try {
            dia = diaDaData(data);
        } catch (const std::exception& erro) {
            return crow::response(400, erro.what());
        }

        sqlite3_stmt* espacoStmt = nullptr;
        if (sqlite3_prepare_v2(catalogoDb,
                "SELECT codigo, nome FROM espacos WHERE id = ?;", -1, &espacoStmt, nullptr) != SQLITE_OK) {
            return crow::response(500, sqlite3_errmsg(catalogoDb));
        }
        sqlite3_bind_int(espacoStmt, 1, idEspaco);
        const int resultadoEspaco = sqlite3_step(espacoStmt);
        if (resultadoEspaco != SQLITE_ROW) {
            sqlite3_finalize(espacoStmt);
            if (resultadoEspaco == SQLITE_DONE) return crow::response(404, "Espaco nao encontrado.");
            return crow::response(500, sqlite3_errmsg(catalogoDb));
        }

        const auto textoEspaco = [espacoStmt](int coluna) {
            const auto* valor = sqlite3_column_text(espacoStmt, coluna);
            return valor ? reinterpret_cast<const char*>(valor) : "";
        };
        const std::string codigo = textoEspaco(0);
        const std::string nome = textoEspaco(1);
        sqlite3_finalize(espacoStmt);
        const std::string identificacao = codigo.empty() ? nome : codigo;

        const char* sql =
            "SELECT r.id, r.data_inicio, r.data_fim, r.status, "
            "h.dia_semana, h.hora_inicio_min, h.hora_fim_min "
            "FROM reservas r "
            "JOIN espacos e ON e.id = r.id_espaco "
            "JOIN reserva_horarios h ON h.id_reserva = r.id "
            "WHERE e.identificacao = ? AND r.data_inicio <= ? AND r.data_fim >= ? "
            "AND h.dia_semana = ? AND r.status IN ('PENDENTE', 'APROVADA') "
            "ORDER BY h.hora_inicio_min, h.hora_fim_min;";
        sqlite3_stmt* agendaStmt = nullptr;
        if (sqlite3_prepare_v2(db, sql, -1, &agendaStmt, nullptr) != SQLITE_OK) {
            return crow::response(500, sqlite3_errmsg(db));
        }
        sqlite3_bind_text(agendaStmt, 1, identificacao.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(agendaStmt, 2, data.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(agendaStmt, 3, data.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(agendaStmt, 4, toString(dia), -1, SQLITE_TRANSIENT);

        std::vector<crow::json::wvalue> horarios;
        int resultado = SQLITE_OK;
        while ((resultado = sqlite3_step(agendaStmt)) == SQLITE_ROW) {
            crow::json::wvalue item;
            item["idReserva"] = sqlite3_column_int(agendaStmt, 0);
            item["dataInicio"] = reinterpret_cast<const char*>(sqlite3_column_text(agendaStmt, 1));
            item["dataFim"] = reinterpret_cast<const char*>(sqlite3_column_text(agendaStmt, 2));
            item["status"] = reinterpret_cast<const char*>(sqlite3_column_text(agendaStmt, 3));
            item["dia"] = reinterpret_cast<const char*>(sqlite3_column_text(agendaStmt, 4));
            item["inicioMin"] = sqlite3_column_int(agendaStmt, 5);
            item["fimMin"] = sqlite3_column_int(agendaStmt, 6);
            horarios.push_back(std::move(item));
        }
        sqlite3_finalize(agendaStmt);
        if (resultado != SQLITE_DONE) return crow::response(500, sqlite3_errmsg(db));

        crow::json::wvalue resposta;
        resposta["data"] = data;
        resposta["horarios"] = std::move(horarios);
        return crow::response(resposta);
    });

    // ---------------------------------------------
    // GET /api/espacos/disponiveis?dia=&inicio=&fim=&data=&capacidade=
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/espacos/disponiveis").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto dia = req.url_params.get("dia");
        auto inicio = req.url_params.get("inicio");
        auto fim = req.url_params.get("fim");
        auto data = req.url_params.get("data");
        auto capacidade = req.url_params.get("capacidade");

        if (!dia || !inicio || !fim || !data) {
            return crow::response(400, "Parametros 'dia', 'inicio', 'fim' e 'data' sao obrigatorios.");
        }

        std::vector<std::shared_ptr<Espaco>> disponiveis;
        try {
            const auto diaSemana = diaSemanaFromString(dia);
            if (diaSemana != diaDaData(data)) {
                return crow::response(400, "O dia da semana nao corresponde a data informada.");
            }
            const Horario horario(diaSemana, std::stoi(inicio), std::stoi(fim));
            const int capMinima = capacidade ? std::stoi(capacidade) : 0;
            if (capMinima < 0) return crow::response(400, "Capacidade nao pode ser negativa.");
            disponiveis = sistema.listarEspacosDisponiveis(horario, data, capMinima);
        } catch (const std::exception& erro) {
            return crow::response(400, erro.what());
        }

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

    CROW_ROUTE(app, "/api/auth/register").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || body.t() != crow::json::type::Object ||
            !body.has("nome") || !body.has("email") || !body.has("senha") ||
            !body.has("departamento") ||
            body["nome"].t() != crow::json::type::String ||
            body["email"].t() != crow::json::type::String ||
            body["senha"].t() != crow::json::type::String ||
            body["departamento"].t() != crow::json::type::String) {
            return crow::response(400, "Campos obrigatorios: nome, email, senha e departamento.");
        }

        try {
            const bool cadastrado = sistema.cadastrarProfessor(
                static_cast<std::string>(body["nome"]),
                static_cast<std::string>(body["email"]),
                static_cast<std::string>(body["senha"]),
                static_cast<std::string>(body["departamento"]));
            if (!cadastrado) return crow::response(409, "Ja existe uma conta com esse e-mail.");

            crow::json::wvalue resposta;
            resposta["mensagem"] = "Conta de professor criada. Voce ja pode entrar.";
            resposta["tipo"] = "PROFESSOR";
            crow::response response(resposta);
            response.code = 201;
            return response;
        } catch (const std::invalid_argument& erro) {
            return crow::response(400, erro.what());
        } catch (const std::exception&) {
            return crow::response(500, "Nao foi possivel criar a conta.");
        }
    });

    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();

        crow::json::wvalue resposta;
        resposta["nome"] = usuario->getNome();
        resposta["email"] = usuario->getEmail();
        resposta["tipo"] = std::dynamic_pointer_cast<Professor>(usuario)
            ? "PROFESSOR" : "ADMINISTRADOR";
        return crow::response(resposta);
    });

    CROW_ROUTE(app, "/api/reservas/minhas").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto professor = std::dynamic_pointer_cast<Professor>(autenticar(req, sistema));
        if (!professor) return respostaNaoAutorizada();

        std::vector<crow::json::wvalue> resposta;
        for (const auto& reserva : sistema.getRepositorioReservas().listarTodos()) {
            if (!reserva->getSolicitante() ||
                reserva->getSolicitante()->getId() != professor->getId()) continue;

            crow::json::wvalue item;
            item["id"] = reserva->getId();
            item["dataInicio"] = reserva->getDataInicio();
            item["dataFim"] = reserva->getDataFim();
            item["status"] = toString(reserva->getStatus());
            if (reserva->getEspaco()) {
                item["espaco"] = reserva->getEspaco()->getIdentificacao();
                item["tipoEspaco"] = reserva->getEspaco()->tipo();
            }

            std::vector<crow::json::wvalue> horarios;
            for (const auto& horario : reserva->getHorarios()) {
                crow::json::wvalue horarioJson;
                horarioJson["dia"] = toString(horario.getDiaSemana());
                horarioJson["inicioMin"] = horario.getHoraInicioMin();
                horarioJson["fimMin"] = horario.getHoraFimMin();
                horarios.push_back(std::move(horarioJson));
            }
            item["horarios"] = std::move(horarios);
            resposta.push_back(std::move(item));
        }
        crow::json::wvalue corpo = std::move(resposta);
        return crow::response(corpo);
    });

    CROW_ROUTE(app, "/api/reservas/pendentes").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto administrador = std::dynamic_pointer_cast<Administrador>(autenticar(req, sistema));
        if (!administrador) return respostaNaoAutorizada();

        std::vector<crow::json::wvalue> reservasPendentes;
        for (const auto& reserva : sistema.getRepositorioReservas().listarTodos()) {
            if (reserva->getStatus() != StatusReserva::PENDENTE) continue;

            crow::json::wvalue item;
            item["id"] = reserva->getId();
            item["dataInicio"] = reserva->getDataInicio();
            item["dataFim"] = reserva->getDataFim();
            item["status"] = toString(reserva->getStatus());
            if (reserva->getSolicitante()) item["professor"] = reserva->getSolicitante()->getNome();
            if (reserva->getEspaco()) {
                item["espaco"] = reserva->getEspaco()->getIdentificacao();
                item["tipoEspaco"] = reserva->getEspaco()->tipo();
            }

            std::vector<crow::json::wvalue> horarios;
            for (const auto& horario : reserva->getHorarios()) {
                crow::json::wvalue horarioJson;
                horarioJson["dia"] = toString(horario.getDiaSemana());
                horarioJson["inicioMin"] = horario.getHoraInicioMin();
                horarioJson["fimMin"] = horario.getHoraFimMin();
                horarios.push_back(std::move(horarioJson));
            }
            item["horarios"] = std::move(horarios);
            reservasPendentes.push_back(std::move(item));
        }
        crow::json::wvalue corpo = std::move(reservasPendentes);
        return crow::response(corpo);
    });

    // ---------------------------------------------
    // POST /api/reservas - cria uma solicitacao de reserva
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        auto professor = std::dynamic_pointer_cast<Professor>(usuario);
        if (!professor) return respostaNaoAutorizada();

        auto body = crow::json::load(req.body);
        if (!body) {
            return crow::response(400, "JSON invalido.");
        }
        if (body.t() != crow::json::type::Object || !body.has("idEspaco") ||
            !body.has("dataInicio") || !body.has("dataFim") || !body.has("horarios")) {
            return crow::response(400, "Campos obrigatorios: idEspaco, dataInicio, dataFim e horarios.");
        }

        std::shared_ptr<Espaco> espaco;
        std::shared_ptr<Reserva> reserva;
        try {
            const auto& idEspacoJson = body["idEspaco"];
            const auto& dataInicioJson = body["dataInicio"];
            const auto& dataFimJson = body["dataFim"];
            const auto& horariosJson = body["horarios"];
            if (idEspacoJson.t() != crow::json::type::Number ||
                dataInicioJson.t() != crow::json::type::String ||
                dataFimJson.t() != crow::json::type::String ||
                horariosJson.t() != crow::json::type::List) {
                return crow::response(400, "Tipos invalidos nos campos da reserva.");
            }

            const auto idEspaco = idEspacoJson.i();
            if (idEspaco <= 0 || idEspaco > std::numeric_limits<int>::max()) {
                return crow::response(400, "idEspaco invalido.");
            }
            const std::string dataInicio = static_cast<std::string>(dataInicioJson);
            const std::string dataFim = static_cast<std::string>(dataFimJson);
            diaDaData(dataInicio);
            diaDaData(dataFim);
            if (dataFim < dataInicio) return crow::response(400, "dataFim deve ser igual ou posterior a dataInicio.");
            if (horariosJson.size() == 0) return crow::response(400, "Informe ao menos um horario.");

            std::vector<Horario> horarios;
            for (std::size_t i = 0; i < horariosJson.size(); ++i) {
                const auto& horarioJson = horariosJson[i];
                if (horarioJson.t() != crow::json::type::Object || !horarioJson.has("dia") ||
                    !horarioJson.has("inicioMin") || !horarioJson.has("fimMin") ||
                    horarioJson["dia"].t() != crow::json::type::String ||
                    horarioJson["inicioMin"].t() != crow::json::type::Number ||
                    horarioJson["fimMin"].t() != crow::json::type::Number) {
                    return crow::response(400, "Cada horario requer dia, inicioMin e fimMin validos.");
                }
                const auto inicio = horarioJson["inicioMin"].i();
                const auto fim = horarioJson["fimMin"].i();
                if (inicio < 0 || fim > 1440 || inicio >= fim) {
                    return crow::response(400, "Horario deve estar no intervalo de 0 a 1440 minutos e ter inicio anterior ao fim.");
                }
                horarios.emplace_back(
                    diaSemanaFromString(static_cast<std::string>(horarioJson["dia"])),
                    static_cast<int>(inicio), static_cast<int>(fim));
            }

            espaco = sistema.getRepositorioEspacos().buscar(static_cast<int>(idEspaco));
            if (!espaco) return crow::response(404, "Espaco nao encontrado.");
            reserva = std::make_shared<Reserva>(0, dataInicio, dataFim, professor, espaco, std::move(horarios));
        } catch (const std::exception& erro) {
            return crow::response(400, erro.what());
        }

        try {
            if (!professor->solicitarReserva(sistema, reserva)) {
                return crow::response(409, "Reserva indisponivel ou solicitante sem permissao para o espaco.");
            }
        } catch (const std::exception& erro) {
            return crow::response(500, erro.what());
        }

        crow::json::wvalue resposta;
        resposta["id"] = reserva->getId();
        resposta["status"] = toString(reserva->getStatus());
        return crow::response(201, resposta);
    });

    // ---------------------------------------------
    // POST /api/reservas/:id/aprovar
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas/<int>/aprovar").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req, int idReserva) {
        auto administrador = std::dynamic_pointer_cast<Administrador>(autenticar(req, sistema));
        if (!administrador) return respostaNaoAutorizada();
        try {
            if (!administrador->aprovarReserva(sistema, idReserva)) {
                return crow::response(409, "Reserva inexistente ou nao esta pendente.");
            }
        } catch (const std::exception& erro) {
            return crow::response(500, erro.what());
        }
        return crow::response(204);
    });

    CROW_ROUTE(app, "/api/reservas/<int>/rejeitar").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req, int idReserva) {
        auto administrador = std::dynamic_pointer_cast<Administrador>(autenticar(req, sistema));
        if (!administrador) return respostaNaoAutorizada();
        try {
            if (!administrador->rejeitarReserva(sistema, idReserva)) {
                return crow::response(409, "Reserva inexistente ou nao esta pendente.");
            }
        } catch (const std::exception& erro) {
            return crow::response(500, erro.what());
        }
        return crow::response(204);
    });

    CROW_ROUTE(app, "/api/reservas/<int>/cancelar").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req, int idReserva) {
        auto professor = std::dynamic_pointer_cast<Professor>(autenticar(req, sistema));
        if (!professor) return respostaNaoAutorizada();
        try {
            if (!professor->cancelarReserva(sistema, idReserva)) {
                return crow::response(409, "Reserva inexistente, indisponivel para cancelamento ou pertencente a outro usuario.");
            }
        } catch (const std::exception& erro) {
            return crow::response(500, erro.what());
        }
        return crow::response(204);
    });

    app.bindaddr("127.0.0.1").port(18080).multithreaded().run();

    sqlite3_close(catalogoDb);
    sqlite3_close(db);
    return 0;
}
