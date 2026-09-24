#include <fstream>
#include <sstream>
#include <sqlite3.h>
#include "crow.h"

#include "services/SistemaDeReservas.hpp"
#include "models/SalaAula.hpp"
#include "models/Professor.hpp"
#include "models/Administrador.hpp"

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

static void adicionarCors(crow::response& resposta) {
    resposta.set_header("Access-Control-Allow-Origin", "*");
    resposta.set_header("Access-Control-Allow-Headers", "Content-Type");
    resposta.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

static crow::response respostaJson(crow::json::wvalue valor, int status = 200) {
    crow::response resposta(status, valor);
    adicionarCors(resposta);
    return resposta;
}

static crow::response respostaTexto(int status, const std::string& mensagem) {
    crow::response resposta(status, mensagem);
    adicionarCors(resposta);
    return resposta;
}

static std::shared_ptr<Professor> buscarProfessor(sqlite3* db, int id) {
    const char* sql = "SELECT id, nome, email, senha_hash, departamento FROM usuarios WHERE id = ? AND tipo = 'PROFESSOR';";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return nullptr;
    sqlite3_bind_int(stmt, 1, id);
    std::shared_ptr<Professor> professor;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        professor = std::make_shared<Professor>(
            sqlite3_column_int(stmt, 0),
            reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)),
            reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2)),
            reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)),
            reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4)));
    }
    sqlite3_finalize(stmt);
    return professor;
}

static bool usuarioEhAdministrador(sqlite3* db, int id) {
    const char* sql = "SELECT 1 FROM usuarios WHERE id = ? AND tipo = 'ADMINISTRADOR';";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, id);
    bool resultado = sqlite3_step(stmt) == SQLITE_ROW;
    sqlite3_finalize(stmt);
    return resultado;
}

static int inteiroJson(const crow::json::rvalue& body, const char* chave) {
    return body[chave].i();
}

static void inserirDadosDemonstracao(sqlite3* db) {
    const char* sql = R"SQL(
        INSERT OR IGNORE INTO espacos (codigo, identificacao, capacidade, bloco, andar, detalhes, mobilia, qtd_tomadas, acessivel_cadeirante, requer_retirada_chave, em_manutencao, tipo) VALUES
        ('A014','Sala de Aula A014',40,'BLOCO_A','Térreo','Sala de aula do Bloco A','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('ANF_A','Anfiteatro',180,'BLOCO_A','Térreo','Anfiteatro externo do Bloco A','FIXA_ANFITEATRO',8,1,0,0,'AUDITORIO'),
        ('A101','LIVE',30,'BLOCO_A','1º andar','Laboratório LIVE','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('A127','Laboratório APG',30,'BLOCO_A','1º andar','Laboratório de pós-graduação APG','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('GRAD1','Grad 1',30,'BLOCO_B','Térreo','Laboratório de graduação Grad 1','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('GRAD2','Grad 2',30,'BLOCO_B','Térreo','Laboratório de graduação Grad 2','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('GRAD3','Grad 3',30,'BLOCO_B','Térreo','Laboratório de graduação Grad 3','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('GRAD4','Grad 4',30,'BLOCO_B','Térreo','Laboratório de graduação Grad 4','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('GRAD5','Grad 5',30,'BLOCO_B','Térreo','Laboratório de graduação Grad 5','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('ROBOCIN','RoboCin',30,'BLOCO_B','Térreo','Laboratório de pesquisa RoboCin','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('C013_015','Laboratório Pós-Graduação C013/C015',30,'BLOCO_C','Térreo','Laboratório de pós-graduação','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('LAB_HW','Laboratório de Hardware',30,'BLOCO_C','Térreo','Laboratório de Hardware','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('AUD_SAMSUNG','Auditório Samsung',180,'BLOCO_C','1º andar','Auditório Samsung','FIXA_ANFITEATRO',8,1,0,0,'AUDITORIO'),
        ('D002','Sala de Aula D002',40,'BLOCO_D','Térreo','Sala de aula do CCEN','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('D003','Sala de Aula D003',40,'BLOCO_D','Térreo','Sala de aula do CCEN','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('D004','Sala de Aula D004',40,'BLOCO_D','Térreo','Sala de aula do CCEN','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('D005','Sala de Aula D005',40,'BLOCO_D','Térreo','Sala de aula do CCEN','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E101','Maratona E101',30,'BLOCO_E','1º andar','Espaço Maratona de Programação','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E102','Sala de Reunião E102',12,'BLOCO_E','1º andar','Sala de reunião','CADEIRAS_MOVEIS',4,1,0,0,'SALA_REUNIAO'),
        ('E112','Sala de Aula E112',40,'BLOCO_E','1º andar','Sala de aula Bloco E','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E113','Sala de Aula E113',40,'BLOCO_E','1º andar','Sala de aula Bloco E','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E121','Sala de Aula E121',40,'BLOCO_E','1º andar','Sala de aula Bloco E','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E122','Sala de Aula E122',40,'BLOCO_E','1º andar','Sala de aula Bloco E','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E125','PET Informática',30,'BLOCO_E','1º andar','Espaço PET Informática','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E126','CinCoders',30,'BLOCO_E','1º andar','Laboratório CinCoders','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E127','CITI',30,'BLOCO_E','1º andar','Empresa Júnior / Espaço CITI','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E131','Sala de Aula E131',40,'BLOCO_E','1º andar','Sala em formato anfiteatro','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E132','Sala de Aula E132',40,'BLOCO_E','1º andar','Sala em formato anfiteatro','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E201','Estúdio E201',30,'BLOCO_E','2º andar','Estúdio multimídia','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E202','Sala de Reunião E202',12,'BLOCO_E','2º andar','Sala de reunião','CADEIRAS_MOVEIS',4,1,0,0,'SALA_REUNIAO'),
        ('E203','Sala de Reunião E203',12,'BLOCO_E','2º andar','Sala de reunião','CADEIRAS_MOVEIS',4,1,0,0,'SALA_REUNIAO'),
        ('E204','Sala de Reunião E204',12,'BLOCO_E','2º andar','Sala de reunião','CADEIRAS_MOVEIS',4,1,0,0,'SALA_REUNIAO'),
        ('E205','Auditório Academy',180,'BLOCO_E','2º andar','Auditório Academy','FIXA_ANFITEATRO',8,1,0,0,'AUDITORIO'),
        ('E231','Sala de Aula E231',40,'BLOCO_E','2º andar','Sala de aula Bloco E','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E232','Sala de Aula E232',40,'BLOCO_E','2º andar','Sala em formato anfiteatro','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E233','Sala de Aula E233',40,'BLOCO_E','2º andar','Sala em formato anfiteatro','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('SANDPIT','SandPit',30,'BLOCO_E','2º andar','Espaço e laboratório SandPit','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('MAKER','Espaço Maker',30,'BLOCO_E','2º andar','Laboratório Maker','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E331','Sala de Aula E331',40,'BLOCO_E','3º andar','Sala de aula Bloco E','CADEIRAS_MOVEIS',8,1,0,0,'SALA_AULA'),
        ('E332','Laboratório INES/PRO.NET',30,'BLOCO_E','3º andar','Laboratório de pesquisa INES/PRO.NET/PRIMO','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E333','Laboratório AI ID',30,'BLOCO_E','3º andar','Laboratório de IA e Inovação','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('ACADEMY','Apple Developer Academy',30,'BLOCO_E','3º andar','Laboratório de desenvolvimento','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E401_402','Sala de Reunião E401/E402',12,'BLOCO_E','4º andar','Sala de reunião','CADEIRAS_MOVEIS',4,1,0,0,'SALA_REUNIAO'),
        ('E403_404','Sala de Reunião E403/E404',12,'BLOCO_E','4º andar','Sala de reunião','CADEIRAS_MOVEIS',4,1,0,0,'SALA_REUNIAO'),
        ('PITCH','Espaço Pitch',30,'BLOCO_E','4º andar','Espaço para apresentações e pitch','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('VOXAR','Voxar Labs',30,'BLOCO_E','4º andar','Laboratório de Realidade Virtual e Visão Computacional','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E432','Laboratório IA 1',30,'BLOCO_E','4º andar','Laboratório de Inteligência Artificial 1','BANCADA_LAB',20,1,0,0,'LABORATORIO'),
        ('E433','Laboratório IA 2',30,'BLOCO_E','4º andar','Laboratório de Inteligência Artificial 2','BANCADA_LAB',20,1,0,0,'LABORATORIO');
    )SQL";

    char* erro = nullptr;
    if (sqlite3_exec(db, sql, nullptr, nullptr, &erro) != SQLITE_OK) {
        std::string mensagem = erro ? erro : "erro desconhecido";
        sqlite3_free(erro);
        throw std::runtime_error("Erro ao inserir dados de demonstracao: " + mensagem);
    }
}

int main() {
    sqlite3* db = nullptr;
    if (sqlite3_open("database/reservas.db", &db) != SQLITE_OK) {
        std::cerr << "Erro ao abrir banco: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }
    aplicarSchema(db, "database/schema.sql");
    inserirDadosDemonstracao(db);

    SistemaDeReservas sistema(db);

    crow::SimpleApp app;

    CROW_ROUTE(app, "/api/auth/cadastro").methods(crow::HTTPMethod::OPTIONS)
    ([]() { return respostaTexto(200, "OK"); });
    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::OPTIONS)
    ([]() { return respostaTexto(200, "OK"); });
    CROW_ROUTE(app, "/api/reservas").methods(crow::HTTPMethod::OPTIONS)
    ([]() { return respostaTexto(200, "OK"); });
    CROW_ROUTE(app, "/api/reservas/<int>/aprovar").methods(crow::HTTPMethod::OPTIONS)
    ([](int) { return respostaTexto(200, "OK"); });
    CROW_ROUTE(app, "/api/reservas/<int>/rejeitar").methods(crow::HTTPMethod::OPTIONS)
    ([](int) { return respostaTexto(200, "OK"); });

    CROW_ROUTE(app, "/api/auth/cadastro").methods(crow::HTTPMethod::POST)
    ([&db](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("nome") || !body.has("email") || !body.has("senha") || !body.has("tipo")) {
            return respostaTexto(400, "Informe nome, email, senha e tipo.");
        }
        std::string nome = body["nome"].s();
        std::string email = body["email"].s();
        std::string senha = body["senha"].s();
        std::string tipo = body["tipo"].s();
        if (tipo != "PROFESSOR" && tipo != "ADMINISTRADOR") return respostaTexto(400, "Tipo de usuario invalido.");
        std::string departamento;
        if (body.has("departamento")) departamento = body["departamento"].s();
        const char* sql = "INSERT INTO usuarios (nome, email, senha_hash, tipo, departamento) VALUES (?, ?, ?, ?, ?);";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return respostaTexto(500, sqlite3_errmsg(db));
        sqlite3_bind_text(stmt, 1, nome.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, email.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, senha.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 4, tipo.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 5, departamento.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(stmt) != SQLITE_DONE) {
            std::string erro = sqlite3_errmsg(db); sqlite3_finalize(stmt);
            return respostaTexto(409, erro);
        }
        int id = static_cast<int>(sqlite3_last_insert_rowid(db));
        sqlite3_finalize(stmt);
        crow::json::wvalue resposta;
        resposta["id"] = id; resposta["nome"] = nome; resposta["email"] = email; resposta["tipo"] = tipo;
        return respostaJson(std::move(resposta), 201);
    });

    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)
    ([&db](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("email") || !body.has("senha")) return respostaTexto(400, "Informe email e senha.");
        const char* sql = "SELECT id, nome, email, senha_hash, tipo, departamento FROM usuarios WHERE email = ?;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return respostaTexto(500, sqlite3_errmsg(db));
        std::string email = body["email"].s();
        sqlite3_bind_text(stmt, 1, email.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(stmt) != SQLITE_ROW) { sqlite3_finalize(stmt); return respostaTexto(401, "Email ou senha invalidos."); }
        std::string senha = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        if (senha != body["senha"].s()) { sqlite3_finalize(stmt); return respostaTexto(401, "Email ou senha invalidos."); }
        crow::json::wvalue resposta;
        resposta["id"] = sqlite3_column_int(stmt, 0);
        resposta["nome"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        resposta["email"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        resposta["tipo"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        resposta["departamento"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
        sqlite3_finalize(stmt);
        return respostaJson(std::move(resposta));
    });

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
            item["codigo"] = espaco->getCodigo();
            item["identificacao"] = espaco->getIdentificacao();
            item["andar"] = espaco->getAndar();
            item["detalhes"] = espaco->getDetalhes();
            item["capacidade"] = espaco->getCapacidade();
            item["tipo"] = espaco->getTipoArmazenado().empty() ? espaco->tipo() : espaco->getTipoArmazenado();
            item["descricao"] = espaco->obterDescricaoDetalhada();
            item["emManutencao"] = espaco->isEmManutencao();
            lista.push_back(std::move(item));
        }
        resposta = std::move(lista);
        crow::response respostaHttp(resposta);
        adicionarCors(respostaHttp);
        return respostaHttp;
    });

    // ---------------------------------------------
    // GET /api/espacos/disponiveis?data=&dia=&inicio=&fim=&capacidade=
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/espacos/disponiveis").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto dia = req.url_params.get("dia");
        auto data = req.url_params.get("data");
        auto inicio = req.url_params.get("inicio");
        auto fim = req.url_params.get("fim");
        auto capacidade = req.url_params.get("capacidade");

        if (!dia || !inicio || !fim || !data) {
            crow::response resposta(400, "Parametros 'data', 'dia', 'inicio' e 'fim' sao obrigatorios.");
            adicionarCors(resposta);
            return resposta;
        }

        DiaSemana diaSemana = diaSemanaFromString(dia);
        Horario horario(diaSemana, std::stoi(inicio), std::stoi(fim));
        int capMinima = capacidade ? std::stoi(capacidade) : 0;

        auto disponiveis = sistema.listarEspacosDisponiveis(horario, data, capMinima);

        crow::json::wvalue resposta;
        std::vector<crow::json::wvalue> lista;
        for (const auto& espaco : disponiveis) {
            crow::json::wvalue item;
            item["id"] = espaco->getId();
            item["codigo"] = espaco->getCodigo();
            item["identificacao"] = espaco->getIdentificacao();
            item["capacidade"] = espaco->getCapacidade();
            item["andar"] = espaco->getAndar();
            item["detalhes"] = espaco->getDetalhes();
            item["tipo"] = espaco->getTipoArmazenado().empty() ? espaco->tipo() : espaco->getTipoArmazenado();
            lista.push_back(std::move(item));
        }
        resposta = std::move(lista);
        crow::response respostaHttp(resposta);
        adicionarCors(respostaHttp);
        return respostaHttp;
    });

    CROW_ROUTE(app, "/api/espacos/<int>/ocupacoes").methods(crow::HTTPMethod::GET)
    ([&db](int idEspaco) {
        const char* sql = "SELECT data_inicio, data_fim, status FROM reservas WHERE id_espaco = ? AND status IN ('PENDENTE', 'APROVADA') ORDER BY data_inicio;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return crow::response(500, sqlite3_errmsg(db));
        sqlite3_bind_int(stmt, 1, idEspaco);
        std::vector<crow::json::wvalue> ocupacoes;
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            crow::json::wvalue item;
            item["inicio"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
            item["fim"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            item["status"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            ocupacoes.push_back(std::move(item));
        }
        sqlite3_finalize(stmt);
        crow::json::wvalue resposta = std::move(ocupacoes);
        return respostaJson(std::move(resposta));
    });

    CROW_ROUTE(app, "/api/usuarios/<int>/reservas").methods(crow::HTTPMethod::GET)
    ([&db](int idUsuario) {
        const char* sql =
            "SELECT r.id, r.data_inicio, r.data_fim, r.status, e.codigo, e.identificacao, "
            "rh.dia_semana, rh.hora_inicio_min, rh.hora_fim_min "
            "FROM reservas r JOIN espacos e ON e.id = r.id_espaco "
            "LEFT JOIN reserva_horarios rh ON rh.id_reserva = r.id "
            "WHERE r.id_professor = ? ORDER BY r.data_inicio, rh.hora_inicio_min;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return crow::response(500, sqlite3_errmsg(db));
        sqlite3_bind_int(stmt, 1, idUsuario);
        std::vector<crow::json::wvalue> reservas;
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            crow::json::wvalue item;
            item["id"] = sqlite3_column_int(stmt, 0);
            item["data"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            item["dataFim"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            item["status"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            item["codigo"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            item["espaco"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            item["dia"] = sqlite3_column_text(stmt, 6) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6)) : "";
            item["inicio"] = sqlite3_column_int(stmt, 7);
            item["fim"] = sqlite3_column_int(stmt, 8);
            reservas.push_back(std::move(item));
        }
        sqlite3_finalize(stmt);
        crow::json::wvalue resposta = std::move(reservas);
        return respostaJson(std::move(resposta));
    });

    CROW_ROUTE(app, "/api/admin/reservas/pendentes").methods(crow::HTTPMethod::GET)
    ([&db](const crow::request& req) {
        auto idAdmin = req.url_params.get("idAdmin");
        if (!idAdmin || !usuarioEhAdministrador(db, std::stoi(idAdmin))) return respostaTexto(403, "Apenas administradores podem acessar esta fila.");
        const char* sql =
            "SELECT r.id, r.data_inicio, r.data_fim, r.status, u.nome, u.email, "
            "e.codigo, e.identificacao, rh.dia_semana, rh.hora_inicio_min, rh.hora_fim_min "
            "FROM reservas r JOIN usuarios u ON u.id = r.id_professor "
            "JOIN espacos e ON e.id = r.id_espaco "
            "LEFT JOIN reserva_horarios rh ON rh.id_reserva = r.id "
            "WHERE r.status = 'PENDENTE' ORDER BY r.data_inicio, rh.hora_inicio_min;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return respostaTexto(500, sqlite3_errmsg(db));
        std::vector<crow::json::wvalue> pendentes;
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            crow::json::wvalue item;
            item["id"] = sqlite3_column_int(stmt, 0);
            item["data"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            item["status"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            item["professor"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            item["email"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            item["codigo"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
            item["espaco"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
            item["dia"] = sqlite3_column_text(stmt, 8) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8)) : "";
            item["inicio"] = sqlite3_column_int(stmt, 9);
            item["fim"] = sqlite3_column_int(stmt, 10);
            pendentes.push_back(std::move(item));
        }
        sqlite3_finalize(stmt);
        crow::json::wvalue resposta = std::move(pendentes);
        return respostaJson(std::move(resposta));
    });

    // ---------------------------------------------
    // POST /api/reservas - cria uma solicitacao de reserva
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas").methods(crow::HTTPMethod::POST)
    ([&sistema, &db](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body) {
            crow::response resposta(400, "JSON invalido.");
            adicionarCors(resposta);
            return resposta;
        }
        if (!body.has("idUsuario") || !body.has("idEspaco") || !body.has("data") ||
            !body.has("dia") || !body.has("inicio") || !body.has("fim")) {
            return crow::response(400, "Informe usuario, espaco, data, dia, inicio e fim.");
        }
        auto professor = buscarProfessor(db, inteiroJson(body, "idUsuario"));
        auto espaco = sistema.getRepositorioEspacos().buscar(inteiroJson(body, "idEspaco"));
        if (!professor) return crow::response(403, "Apenas professores podem criar reservas.");
        if (!espaco) return crow::response(404, "Espaco nao encontrado.");
        int inicio = body["inicio"].i();
        int fim = body["fim"].i();
        if (inicio >= fim) return crow::response(400, "O horario final deve ser maior que o inicial.");
        Horario horario(diaSemanaFromString(body["dia"].s()), inicio, fim);
        auto reserva = std::make_shared<Reserva>(0, body["data"].s(), body["data"].s(), professor, espaco, std::vector<Horario>{horario});
        if (!sistema.processarNovaReserva(reserva)) return crow::response(409, "O espaco esta indisponivel ou a reserva nao foi permitida.");
        crow::json::wvalue resposta;
        resposta["id"] = reserva->getId(); resposta["status"] = "PENDENTE"; resposta["mensagem"] = "Reserva criada e aguardando aprovacao.";
        return respostaJson(std::move(resposta), 201);
    });

    // ---------------------------------------------
    // POST /api/reservas/:id/aprovar
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas/<int>/aprovar").methods(crow::HTTPMethod::POST)
    ([&sistema, &db](const crow::request& req, int idReserva) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("idAdmin") || !usuarioEhAdministrador(db, body["idAdmin"].i())) return respostaTexto(403, "Apenas administradores podem aprovar reservas.");
        auto reserva = sistema.getRepositorioReservas().buscar(idReserva);
        if (!reserva) return respostaTexto(404, "Reserva nao encontrada.");
        if (reserva->getStatus() != StatusReserva::PENDENTE) return respostaTexto(409, "A reserva nao esta pendente.");
        reserva->aprovar();
        sistema.getRepositorioReservas().atualizar(reserva);
        crow::json::wvalue resposta;
        resposta["id"] = idReserva; resposta["status"] = "APROVADA"; resposta["mensagem"] = "Reserva aprovada.";
        return respostaJson(std::move(resposta));
    });

    CROW_ROUTE(app, "/api/reservas/<int>/rejeitar").methods(crow::HTTPMethod::POST)
    ([&sistema, &db](const crow::request& req, int idReserva) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("idAdmin") || !usuarioEhAdministrador(db, body["idAdmin"].i())) return respostaTexto(403, "Apenas administradores podem rejeitar reservas.");
        auto reserva = sistema.getRepositorioReservas().buscar(idReserva);
        if (!reserva) return respostaTexto(404, "Reserva nao encontrada.");
        if (reserva->getStatus() != StatusReserva::PENDENTE) return respostaTexto(409, "A reserva nao esta pendente.");
        reserva->rejeitar();
        sistema.getRepositorioReservas().atualizar(reserva);
        crow::json::wvalue resposta;
        resposta["id"] = idReserva; resposta["status"] = "REJEITADA"; resposta["mensagem"] = "Reserva rejeitada.";
        return respostaJson(std::move(resposta));
    });

    app.port(18080).multithreaded().run();

    sqlite3_close(db);
    return 0;
}
