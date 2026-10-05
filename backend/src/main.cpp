#include <fstream>
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include <limits>
#include <memory>
#include <optional>
#include <string>
#include <sstream>
#include <utility>
#include <vector>
#include <sqlite3.h>
#include "crow.h"

#include "services/SistemaDeReservas.hpp"
#include "models/Administrador.hpp"
#include "models/Auditorio.hpp"
#include "models/Laboratorio.hpp"
#include "models/Professor.hpp"
#include "models/SalaAula.hpp"
#include "models/Usuario.hpp"
#include "util/Datas.hpp"

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

static void garantirColuna(sqlite3* db, const std::string& tabela,
                           const std::string& coluna, const std::string& definicao) {
    const std::string consulta = "PRAGMA table_info(" + tabela + ");";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, consulta.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao consultar schema: ") + sqlite3_errmsg(db));
    }
    bool existe = false;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        const auto* nome = sqlite3_column_text(stmt, 1);
        if (nome && coluna == reinterpret_cast<const char*>(nome)) existe = true;
    }
    sqlite3_finalize(stmt);
    if (existe) return;

    const std::string alteracao = "ALTER TABLE " + tabela + " ADD COLUMN " + coluna + " " + definicao + ";";
    char* erro = nullptr;
    if (sqlite3_exec(db, alteracao.c_str(), nullptr, nullptr, &erro) != SQLITE_OK) {
        const std::string mensagem = erro ? erro : sqlite3_errmsg(db);
        sqlite3_free(erro);
        throw std::runtime_error("Erro ao migrar schema: " + mensagem);
    }
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
    crow::json::wvalue corpo;
    corpo["mensagem"] = "Autenticacao necessaria.";
    corpo["codigo"] = "CREDENCIAIS_INVALIDAS";
    crow::response resposta(401);
    resposta.set_header("Content-Type", "application/json; charset=utf-8");
    resposta.body = corpo.dump();
    resposta.set_header("WWW-Authenticate", "Basic realm=\"Sistema de Reservas\", charset=\"UTF-8\"");
    return resposta;
}

static crow::response respostaErro(int status, const std::string& codigo,
                                   const std::string& mensagem, const std::string& campo = "") {
    crow::json::wvalue corpo;
    corpo["mensagem"] = mensagem;
    corpo["codigo"] = codigo;
    if (!campo.empty()) corpo["campo"] = campo;
    crow::response resposta(status);
    resposta.set_header("Content-Type", "application/json; charset=utf-8");
    resposta.body = corpo.dump();
    return resposta;
}

static std::string normalizarIdentificacao(const std::string& valor) {
    std::string normalizada = valor;
    std::transform(normalizada.begin(), normalizada.end(), normalizada.begin(), [](unsigned char caractere) {
        return static_cast<char>(std::toupper(caractere));
    });
    return normalizada;
}

static crow::response respostaConflitos(const std::vector<ConflitoReserva>& conflitos) {
    std::vector<crow::json::wvalue> lista;
    for (const auto& conflito : conflitos) {
        crow::json::wvalue item;
        item["data"] = conflito.data;
        item["inicioMin"] = conflito.inicioMin;
        item["fimMin"] = conflito.fimMin;
        lista.push_back(std::move(item));
    }
    crow::json::wvalue detalhes;
    detalhes["conflitos"] = std::move(lista);
    crow::json::wvalue corpo;
    corpo["mensagem"] = "Conflito de horario.";
    corpo["codigo"] = "CONFLITO_HORARIO";
    corpo["detalhes"] = std::move(detalhes);
    return crow::response(409, corpo);
}

static std::string lerMotivoOpcional(const crow::request& req) {
    if (req.body.empty()) return {};
    const auto corpo = crow::json::load(req.body);
    if (!corpo || corpo.t() != crow::json::type::Object) {
        throw std::invalid_argument("O corpo deve ser um objeto JSON.");
    }
    if (!corpo.has("motivo")) return {};
    if (corpo["motivo"].t() != crow::json::type::String) {
        throw std::invalid_argument("motivo deve ser texto.");
    }
    return static_cast<std::string>(corpo["motivo"]);
}

static crow::json::wvalue serializarEspaco(const std::shared_ptr<Espaco>& espaco) {
    crow::json::wvalue item;
    item["id"] = espaco->getId();
    item["identificacao"] = espaco->getIdentificacao();
    item["capacidade"] = espaco->getCapacidade();
    item["bloco"] = toString(espaco->getBloco());
    item["mobilia"] = toString(espaco->getMobilia());
    item["qtdTomadas"] = espaco->getQtdTomadas();
    item["acessivelCadeirante"] = espaco->isAcessivelCadeirante();
    item["requerRetiradaChave"] = espaco->isRequerRetiradaChave();
    item["emManutencao"] = espaco->isEmManutencao();
    item["tipo"] = espaco->tipo();
    item["descricao"] = espaco->obterDescricaoDetalhada();
    if (auto sala = std::dynamic_pointer_cast<SalaAula>(espaco)) {
        item["tipoQuadro"] = toString(sala->getTipoQuadro());
        item["possuiProjetor"] = sala->isPossuiProjetor();
    } else if (auto laboratorio = std::dynamic_pointer_cast<Laboratorio>(espaco)) {
        item["qtdComputadores"] = laboratorio->getQtdComputadores();
        std::vector<crow::json::wvalue> softwares;
        for (const auto& software : laboratorio->getSoftwaresInstalados()) {
            softwares.emplace_back(software);
        }
        item["softwaresInstalados"] = std::move(softwares);
    } else if (auto auditorio = std::dynamic_pointer_cast<Auditorio>(espaco)) {
        item["equipamentoSom"] = auditorio->isEquipamentoSom();
        item["cabineTraducao"] = auditorio->isCabineTraducao();
    }
    return item;
}

static std::string lerTexto(const crow::json::rvalue& corpo, const char* chave,
                            const std::string& padrao = "") {
    if (!corpo.has(chave)) return padrao;
    if (corpo[chave].t() != crow::json::type::String) {
        throw std::invalid_argument(std::string("Campo invalido: ") + chave + ".");
    }
    return static_cast<std::string>(corpo[chave]);
}

static int lerInteiro(const crow::json::rvalue& corpo, const char* chave, int padrao = 0) {
    if (!corpo.has(chave)) return padrao;
    if (corpo[chave].t() != crow::json::type::Number) {
        throw std::invalid_argument(std::string("Campo invalido: ") + chave + ".");
    }
    const auto valor = corpo[chave].i();
    if (valor < std::numeric_limits<int>::min() || valor > std::numeric_limits<int>::max()) {
        throw std::invalid_argument(std::string("Campo invalido: ") + chave + ".");
    }
    return static_cast<int>(valor);
}

static bool lerBooleano(const crow::json::rvalue& corpo, const char* chave, bool padrao = false) {
    if (!corpo.has(chave)) return padrao;
    const auto tipo = corpo[chave].t();
    if (tipo != crow::json::type::True && tipo != crow::json::type::False) {
        throw std::invalid_argument(std::string("Campo invalido: ") + chave + ".");
    }
    return corpo[chave].b();
}

static std::shared_ptr<Espaco> construirEspaco(const crow::json::rvalue& corpo, int id = 0) {
    if (!corpo || corpo.t() != crow::json::type::Object) {
        throw std::invalid_argument("O corpo deve ser um objeto JSON.");
    }
    const auto identificacao = normalizarIdentificacao(lerTexto(corpo, "identificacao"));
    const int capacidade = lerInteiro(corpo, "capacidade");
    if (identificacao.empty() || capacidade < 1) {
        throw std::invalid_argument("Identificacao e capacidade positiva sao obrigatorias.");
    }
    const auto bloco = blocoFromString(lerTexto(corpo, "bloco", "BLOCO_A"));
    const auto mobilia = tipoMobiliaFromString(lerTexto(corpo, "mobilia", "CADEIRAS_MOVEIS"));
    const int tomadas = lerInteiro(corpo, "qtdTomadas");
    if (tomadas < 0) throw std::invalid_argument("qtdTomadas nao pode ser negativa.");
    const bool acessivel = lerBooleano(corpo, "acessivelCadeirante");
    const bool chave = lerBooleano(corpo, "requerRetiradaChave");
    const bool manutencao = lerBooleano(corpo, "emManutencao");
    const auto tipo = lerTexto(corpo, "tipo");

    if (tipo == "SALA_AULA") {
        return std::make_shared<SalaAula>(id, identificacao, capacidade, bloco, mobilia,
            tomadas, acessivel, chave, manutencao,
            tipoQuadroFromString(lerTexto(corpo, "tipoQuadro", "BRANCO")),
            lerBooleano(corpo, "possuiProjetor"));
    }
    if (tipo == "LABORATORIO") {
        const int computadores = lerInteiro(corpo, "qtdComputadores");
        if (computadores < 0) throw std::invalid_argument("qtdComputadores nao pode ser negativo.");
        std::vector<std::string> softwares;
        if (corpo.has("softwaresInstalados")) {
            if (corpo["softwaresInstalados"].t() != crow::json::type::List) {
                throw std::invalid_argument("softwaresInstalados deve ser uma lista.");
            }
            for (const auto& software : corpo["softwaresInstalados"]) {
                if (software.t() != crow::json::type::String) {
                    throw std::invalid_argument("Cada software deve ser texto.");
                }
                softwares.push_back(static_cast<std::string>(software));
            }
        }
        return std::make_shared<Laboratorio>(id, identificacao, capacidade, bloco, mobilia,
            tomadas, acessivel, chave, manutencao, computadores, std::move(softwares));
    }
    if (tipo == "AUDITORIO") {
        return std::make_shared<Auditorio>(id, identificacao, capacidade, bloco, mobilia,
            tomadas, acessivel, chave, manutencao,
            lerBooleano(corpo, "equipamentoSom"), lerBooleano(corpo, "cabineTraducao"));
    }
    throw std::invalid_argument("Tipo de espaco invalido.");
}

static bool identificacaoEmUso(SistemaDeReservas& sistema, const std::string& identificacao,
                               int ignorarId = 0) {
    for (const auto& espaco : sistema.getRepositorioEspacos().listarTodos()) {
        if (espaco->getId() != ignorarId &&
            normalizarIdentificacao(espaco->getIdentificacao()) == normalizarIdentificacao(identificacao)) return true;
    }
    return false;
}

static BlocoCIn blocoMock(const std::string& bloco) {
    if (bloco == "A") return BlocoCIn::BLOCO_A;
    if (bloco == "B") return BlocoCIn::BLOCO_B;
    if (bloco == "C") return BlocoCIn::BLOCO_C;
    if (bloco == "D") return BlocoCIn::BLOCO_D;
    if (bloco == "E") return BlocoCIn::BLOCO_E;
    return BlocoCIn::AREA_2;
}

static void semearEspacosMock(SistemaDeReservas& sistema, sqlite3* catalogoDb) {
    auto& repositorio = sistema.getRepositorioEspacos();
    if (!repositorio.listarTodos().empty()) return;

    sqlite3_stmt* stmt = nullptr;
    const char* sql = "SELECT id, codigo, nome, tipo, bloco FROM espacos ORDER BY id;";
    if (sqlite3_prepare_v2(catalogoDb, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("Erro ao preparar carga mock do catalogo: ") + sqlite3_errmsg(catalogoDb));
    }
    const auto texto = [stmt](int coluna) {
        const auto* valor = sqlite3_column_text(stmt, coluna);
        return valor ? reinterpret_cast<const char*>(valor) : "";
    };

    int carregados = 0;
    int resultado = SQLITE_OK;
    while ((resultado = sqlite3_step(stmt)) == SQLITE_ROW) {
        const int idCatalogo = sqlite3_column_int(stmt, 0);
        const std::string codigo = texto(1);
        const std::string nome = texto(2);
        const std::string tipo = texto(3);
        const std::string bloco = texto(4);
        const std::string identificacaoBase = codigo.empty() ? nome : codigo;
        if (identificacaoBase.empty()) continue;

        std::string identificacao = identificacaoBase;
        if (identificacaoEmUso(sistema, identificacao)) {
            identificacao = nome.empty() ? identificacaoBase : nome;
        }
        if (identificacaoEmUso(sistema, identificacao)) {
            identificacao += "-" + std::to_string(idCatalogo);
        }

        const auto localizacao = blocoMock(bloco);
        std::shared_ptr<Espaco> espaco;
        if (tipo == "Sala") {
            espaco = std::make_shared<SalaAula>(0, identificacao, 40, localizacao,
                TipoMobilia::CADEIRAS_MOVEIS, 0, false, false, false,
                TipoQuadro::BRANCO, false);
        } else if (tipo == "Laborat\xC3\xB3" "rio") {
            espaco = std::make_shared<Laboratorio>(0, identificacao, 30, localizacao,
                TipoMobilia::BANCADA_LAB, 0, false, false, false, 20,
                std::vector<std::string>{});
        } else if (tipo == "Audit\xC3\xB3" "rio" || tipo == "Anfiteatro") {
            espaco = std::make_shared<Auditorio>(0, identificacao, 120, localizacao,
                TipoMobilia::FIXA_ANFITEATRO, 0, false, false, false, false, false);
        } else {
            continue;
        }
        repositorio.salvar(std::move(espaco));
        ++carregados;
    }
    sqlite3_finalize(stmt);
    if (resultado != SQLITE_DONE) {
        throw std::runtime_error(std::string("Erro ao ler catalogo para carga mock: ") + sqlite3_errmsg(catalogoDb));
    }
    std::cout << carregados << " espacos reservaveis mock carregados do catalogo CIn.\n";
}

// Dados publicos da conta; o hash da senha nunca sai na resposta.
static crow::json::wvalue serializarUsuario(const std::shared_ptr<Usuario>& usuario) {
    crow::json::wvalue item;
    item["id"] = usuario->getId();
    item["nome"] = usuario->getNome();
    item["email"] = usuario->getEmail();
    item["tipo"] = usuario->tipo();
    if (auto professor = std::dynamic_pointer_cast<Professor>(usuario)) {
        item["departamento"] = professor->getDepartamento();
    }
    return item;
}

static crow::response respostaRemocaoUsuario(ResultadoRemocaoUsuario resultado) {
    switch (resultado) {
    case ResultadoRemocaoUsuario::REMOVIDO:
        return crow::response(204);
    case ResultadoRemocaoUsuario::NAO_ENCONTRADO:
        return respostaErro(404, "USUARIO_NAO_ENCONTRADO", "Usuario nao encontrado.");
    case ResultadoRemocaoUsuario::ADMINISTRADOR:
        return respostaErro(403, "SEM_PERMISSAO", "Contas de administrador nao podem ser removidas.");
    case ResultadoRemocaoUsuario::POSSUI_RESERVAS:
        return respostaErro(409, "USUARIO_COM_RESERVAS",
                            "A conta possui reservas vinculadas e nao pode ser removida.");
    }
    return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel remover o usuario.");
}

static crow::json::wvalue serializarReserva(const std::shared_ptr<Reserva>& reserva) {
    crow::json::wvalue item;
    item["id"] = reserva->getId();
    item["dataInicio"] = reserva->getDataInicio();
    item["dataFim"] = reserva->getDataFim();
    item["status"] = toString(reserva->getStatus());
    if (!reserva->getCriadaEm().empty()) item["criadaEm"] = reserva->getCriadaEm();
    if (reserva->getMotivo().empty()) item["motivo"] = nullptr;
    else item["motivo"] = reserva->getMotivo();
    if (reserva->getEspaco()) {
        crow::json::wvalue espaco;
        espaco["id"] = reserva->getEspaco()->getId();
        espaco["identificacao"] = reserva->getEspaco()->getIdentificacao();
        espaco["tipo"] = reserva->getEspaco()->tipo();
        item["espaco"] = std::move(espaco);
    }
    if (reserva->getSolicitante()) {
        crow::json::wvalue professor;
        professor["id"] = reserva->getSolicitante()->getId();
        professor["nome"] = reserva->getSolicitante()->getNome();
        professor["email"] = reserva->getSolicitante()->getEmail();
        item["professor"] = std::move(professor);
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
    return item;
}

int main() {
    sqlite3* db = nullptr;
    if (sqlite3_open("database/reservas.db", &db) != SQLITE_OK) {
        std::cerr << "Erro ao abrir banco: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }
    aplicarSchema(db, "database/schema.sql");
    garantirColuna(db, "reservas", "criada_em", "TEXT");
    garantirColuna(db, "reservas", "motivo", "TEXT");
    if (sqlite3_exec(db,
            "UPDATE reservas SET criada_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') "
            "WHERE criada_em IS NULL OR criada_em = '';", nullptr, nullptr, nullptr) != SQLITE_OK) {
        std::cerr << "Erro ao preencher datas de criacao antigas: " << sqlite3_errmsg(db) << '\n';
        sqlite3_close(db);
        return 1;
    }

    sqlite3* catalogoDb = nullptr;
    if (sqlite3_open_v2("database/cin_2026.db", &catalogoDb, SQLITE_OPEN_READONLY, nullptr) != SQLITE_OK) {
        std::cerr << "Erro ao abrir catalogo CIn: " << sqlite3_errmsg(catalogoDb) << std::endl;
        sqlite3_close(catalogoDb);
        sqlite3_close(db);
        return 1;
    }

    SistemaDeReservas sistema(db);

    const char* emailAdmin = std::getenv("CIN_ADMIN_EMAIL");
    const char* senhaAdmin = std::getenv("CIN_ADMIN_SENHA");
    if ((emailAdmin == nullptr) != (senhaAdmin == nullptr)) {
        std::cerr << "Defina CIN_ADMIN_EMAIL e CIN_ADMIN_SENHA juntos para provisionar o administrador.\n";
        sqlite3_close(catalogoDb);
        sqlite3_close(db);
        return 1;
    }
    if (emailAdmin && senhaAdmin) {
        RepositorioUsuario usuarios(db);
        if (!usuarios.existeAdministrador()) {
            const char* nomeAdmin = std::getenv("CIN_ADMIN_NOME");
            const std::string nome = nomeAdmin && *nomeAdmin ? nomeAdmin : "Administrador do Sistema";
            if (std::string(emailAdmin).empty() || std::string(senhaAdmin).size() < 8) {
                std::cerr << "CIN_ADMIN_EMAIL e uma senha com ao menos 8 caracteres sao obrigatorios.\n";
                sqlite3_close(catalogoDb);
                sqlite3_close(db);
                return 1;
            }
            try {
                if (!usuarios.cadastrarAdministrador(nome, emailAdmin, Usuario::gerarHashSenha(senhaAdmin))) {
                    std::cerr << "Nao foi possivel provisionar o administrador: email ja cadastrado.\n";
                    sqlite3_close(catalogoDb);
                    sqlite3_close(db);
                    return 1;
                }
                std::cout << "Administrador inicial provisionado para " << emailAdmin << ".\n";
            } catch (const std::exception& erro) {
                std::cerr << "Falha ao provisionar administrador: " << erro.what() << '\n';
                sqlite3_close(catalogoDb);
                sqlite3_close(db);
                return 1;
            }
        }
    }

    try {
        semearEspacosMock(sistema, catalogoDb);
    } catch (const std::exception& erro) {
        std::cerr << "Falha ao carregar espacos mock: " << erro.what() << '\n';
        sqlite3_close(catalogoDb);
        sqlite3_close(db);
        return 1;
    }

    crow::SimpleApp app;

    // ---------------------------------------------
    // GET /api/espacos - lista todos os espacos
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/espacos").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        const auto trava = sistema.travarBanco();
        const char* tipo = req.url_params.get("tipo");
        const char* bloco = req.url_params.get("bloco");
        const char* capacidade = req.url_params.get("capacidadeMin");
        const char* acessivel = req.url_params.get("acessivel");
        int capacidadeMinima = 0;
        try {
            if (capacidade) capacidadeMinima = std::stoi(capacidade);
        } catch (const std::exception&) {
            return respostaErro(400, "VALIDACAO", "Capacidade minima invalida.", "capacidadeMin");
        }
        if (capacidadeMinima < 0) {
            return respostaErro(400, "VALIDACAO", "Capacidade minima nao pode ser negativa.", "capacidadeMin");
        }

        std::vector<crow::json::wvalue> lista;
        try {
            auto espacos = sistema.getRepositorioEspacos().listarTodos();
            std::sort(espacos.begin(), espacos.end(), [](const auto& a, const auto& b) {
                return a->getIdentificacao() < b->getIdentificacao();
            });
            for (const auto& espaco : espacos) {
                if (tipo && espaco->tipo() != tipo) continue;
                if (bloco && toString(espaco->getBloco()) != std::string(bloco)) continue;
                if (espaco->getCapacidade() < capacidadeMinima) continue;
                if (acessivel && std::string(acessivel) == "true" && !espaco->isAcessivelCadeirante()) continue;
                lista.push_back(serializarEspaco(espaco));
            }
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel listar os espacos.");
        }
        crow::json::wvalue resposta;
        resposta = std::move(lista);
        return crow::response(resposta);
    });

    CROW_ROUTE(app, "/api/espacos/<int>").methods(crow::HTTPMethod::GET)
    ([&sistema](int id) {
        const auto trava = sistema.travarBanco();
        auto espaco = sistema.getRepositorioEspacos().buscar(id);
        if (!espaco) return respostaErro(404, "ESPACO_NAO_ENCONTRADO", "Espaco nao encontrado.");
        return crow::response(serializarEspaco(espaco));
    });

    CROW_ROUTE(app, "/api/espacos").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem cadastrar espacos.");
        }
        const auto trava = sistema.travarBanco();
        const auto corpo = crow::json::load(req.body);
        try {
            auto espaco = construirEspaco(corpo);
            if (identificacaoEmUso(sistema, espaco->getIdentificacao())) {
                return respostaErro(409, "IDENTIFICACAO_DUPLICADA", "Ja existe um espaco com essa identificacao.", "identificacao");
            }
            sistema.getRepositorioEspacos().salvar(espaco);
            crow::response resposta(serializarEspaco(espaco));
            resposta.code = 201;
            return resposta;
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what());
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel cadastrar o espaco.");
        }
    });

    CROW_ROUTE(app, "/api/espacos/<int>").methods(crow::HTTPMethod::PUT)
    ([&sistema](const crow::request& req, int id) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem editar espacos.");
        }
        const auto trava = sistema.travarBanco();
        auto existente = sistema.getRepositorioEspacos().buscar(id);
        if (!existente) return respostaErro(404, "ESPACO_NAO_ENCONTRADO", "Espaco nao encontrado.");
        const auto corpo = crow::json::load(req.body);
        try {
            auto atualizado = construirEspaco(corpo, id);
            if (atualizado->tipo() != existente->tipo()) {
                return respostaErro(400, "VALIDACAO", "O tipo do espaco nao pode ser alterado.", "tipo");
            }
            if (identificacaoEmUso(sistema, atualizado->getIdentificacao(), id)) {
                return respostaErro(409, "IDENTIFICACAO_DUPLICADA", "Ja existe um espaco com essa identificacao.", "identificacao");
            }
            sistema.getRepositorioEspacos().atualizar(atualizado);
            return crow::response(serializarEspaco(atualizado));
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what());
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel atualizar o espaco.");
        }
    });

    CROW_ROUTE(app, "/api/espacos/<int>").methods(crow::HTTPMethod::PATCH)
    ([&sistema](const crow::request& req, int id) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem alterar a manutencao.");
        }
        const auto trava = sistema.travarBanco();
        auto espaco = sistema.getRepositorioEspacos().buscar(id);
        if (!espaco) return respostaErro(404, "ESPACO_NAO_ENCONTRADO", "Espaco nao encontrado.");
        const auto corpo = crow::json::load(req.body);
        if (!corpo || corpo.t() != crow::json::type::Object || !corpo.has("emManutencao")) {
            return respostaErro(400, "VALIDACAO", "Informe emManutencao.", "emManutencao");
        }
        try {
            espaco->setEmManutencao(lerBooleano(corpo, "emManutencao"));
            sistema.getRepositorioEspacos().atualizar(espaco);
            return crow::response(serializarEspaco(espaco));
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what(), "emManutencao");
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel alterar a manutencao.");
        }
    });

    CROW_ROUTE(app, "/api/espacos/<int>").methods(crow::HTTPMethod::Delete)
    ([&sistema, db](const crow::request& req, int id) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem remover espacos.");
        }
        const auto trava = sistema.travarBanco();
        if (!sistema.getRepositorioEspacos().buscar(id)) {
            return respostaErro(404, "ESPACO_NAO_ENCONTRADO", "Espaco nao encontrado.");
        }
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db, "SELECT COUNT(*) FROM reservas WHERE id_espaco = ?;", -1, &stmt, nullptr) != SQLITE_OK) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel verificar as reservas do espaco.");
        }
        sqlite3_bind_int(stmt, 1, id);
        const bool possuiReservas = sqlite3_step(stmt) == SQLITE_ROW && sqlite3_column_int(stmt, 0) > 0;
        sqlite3_finalize(stmt);
        if (possuiReservas) {
            return respostaErro(409, "ESPACO_COM_RESERVAS", "O espaco possui reservas vinculadas.");
        }
        try {
            sistema.getRepositorioEspacos().remover(id);
            return crow::response(204);
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel remover o espaco.");
        }
    });

    CROW_ROUTE(app, "/api/espacos/<int>/reservas-futuras").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req, int id) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem consultar reservas futuras.");
        }
        const auto trava = sistema.travarBanco();
        if (!sistema.getRepositorioEspacos().buscar(id)) {
            return respostaErro(404, "ESPACO_NAO_ENCONTRADO", "Espaco nao encontrado.");
        }
        int total = 0;
        for (const auto& reserva : sistema.getRepositorioReservas().listarTodos()) {
            const auto status = reserva->getStatus();
            if (reserva->getEspaco()->getId() == id && reserva->getDataFim() >= Datas::hoje() &&
                (status == StatusReserva::PENDENTE || status == StatusReserva::APROVADA)) ++total;
        }
        crow::json::wvalue corpo;
        corpo["total"] = total;
        return crow::response(corpo);
    });

    CROW_ROUTE(app, "/api/espacos/<int>/agenda").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req, int id) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        const auto trava = sistema.travarBanco();
        auto espaco = sistema.getRepositorioEspacos().buscar(id);
        if (!espaco) return respostaErro(404, "ESPACO_NAO_ENCONTRADO", "Espaco nao encontrado.");
        const char* de = req.url_params.get("de");
        const char* ate = req.url_params.get("ate");
        if (!de || !ate) return respostaErro(400, "VALIDACAO", "Informe de e ate.");

        try {
            const std::string inicio(de);
            const std::string fim(ate);
            Datas::diaDaData(inicio);
            Datas::diaDaData(fim);
            if (fim < inicio) return respostaErro(400, "VALIDACAO", "ate deve ser igual ou posterior a de.");

            const bool mostrarProfessor = static_cast<bool>(std::dynamic_pointer_cast<Administrador>(usuario));
            std::vector<crow::json::wvalue> ocupacoes;
            std::size_t dias = 0;
            for (std::string data = inicio; data <= fim; data = Datas::proximaData(data)) {
                if (++dias > 366) return respostaErro(400, "VALIDACAO", "O periodo da agenda nao pode exceder 366 dias.");
                const auto dia = Datas::diaDaData(data);
                for (const auto& reserva : sistema.getRepositorioReservas().listarPorEspacoEData(id, data)) {
                    const auto status = reserva->getStatus();
                    if (status != StatusReserva::PENDENTE && status != StatusReserva::APROVADA) continue;
                    for (const auto& horario : reserva->getHorarios()) {
                        if (horario.getDiaSemana() != dia) continue;
                        crow::json::wvalue item;
                        item["idReserva"] = reserva->getId();
                        item["data"] = data;
                        item["inicioMin"] = horario.getHoraInicioMin();
                        item["fimMin"] = horario.getHoraFimMin();
                        item["status"] = toString(status);
                        if (mostrarProfessor && reserva->getSolicitante()) {
                            crow::json::wvalue professor;
                            professor["id"] = reserva->getSolicitante()->getId();
                            professor["nome"] = reserva->getSolicitante()->getNome();
                            item["professor"] = std::move(professor);
                        }
                        ocupacoes.push_back(std::move(item));
                    }
                }
            }
            crow::json::wvalue resposta;
            resposta["espacoId"] = id;
            resposta["ocupacoes"] = std::move(ocupacoes);
            return crow::response(resposta);
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what());
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel carregar a agenda.");
        }
    });

    CROW_ROUTE(app, "/api/catalogo/espacos").methods(crow::HTTPMethod::GET)
    ([&sistema, catalogoDb]() {
        const auto trava = sistema.travarBanco();
        const char* sql =
            "SELECT id, codigo, nome, tipo, bloco, andar, observacao "
            "FROM espacos ORDER BY bloco, codigo, nome;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(catalogoDb, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel listar o catalogo.");
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
        if (resultado != SQLITE_DONE) return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel listar o catalogo.");

        resposta = std::move(lista);
        return crow::response(resposta);
    });

    // ---------------------------------------------
    // GET /api/espacos/disponiveis?data=&inicio=&fim=&capacidadeMin=
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/espacos/disponiveis").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto dia = req.url_params.get("dia");
        auto inicio = req.url_params.get("inicio");
        auto fim = req.url_params.get("fim");
        auto data = req.url_params.get("data");
        auto capacidade = req.url_params.get("capacidade");
        if (!capacidade) capacidade = req.url_params.get("capacidadeMin");
        auto tipo = req.url_params.get("tipo");
        auto acessivel = req.url_params.get("acessivel");

        if (!inicio || !fim || !data) {
            return respostaErro(400, "VALIDACAO", "Parametros 'inicio', 'fim' e 'data' sao obrigatorios.");
        }

        const auto trava = sistema.travarBanco();
        std::vector<std::shared_ptr<Espaco>> disponiveis;
        try {
            const auto diaSemana = Datas::diaDaData(data);
            if (dia && diaSemanaFromString(dia) != diaSemana) {
                return respostaErro(400, "VALIDACAO", "O dia da semana nao corresponde a data informada.", "dia");
            }
            const Horario horario(diaSemana, std::stoi(inicio), std::stoi(fim));
            const int capMinima = capacidade ? std::stoi(capacidade) : 1;
            if (capMinima < 0) return respostaErro(400, "VALIDACAO", "Capacidade nao pode ser negativa.", "capacidadeMin");
            disponiveis = sistema.listarEspacosDisponiveis(horario, data, capMinima);
        } catch (const std::exception& erro) {
            return respostaErro(400, "VALIDACAO", erro.what());
        }

        std::vector<crow::json::wvalue> lista;
        std::sort(disponiveis.begin(), disponiveis.end(), [](const auto& a, const auto& b) {
            return a->getIdentificacao() < b->getIdentificacao();
        });
        for (const auto& espaco : disponiveis) {
            if (tipo && espaco->tipo() != tipo) continue;
            if (acessivel && std::string(acessivel) == "true" && !espaco->isAcessivelCadeirante()) continue;
            lista.push_back(serializarEspaco(espaco));
        }
        crow::json::wvalue resposta;
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
            return respostaErro(400, "VALIDACAO", "Campos obrigatorios: nome, email, senha e departamento.");
        }

        try {
            const bool cadastrado = sistema.cadastrarProfessor(
                static_cast<std::string>(body["nome"]),
                static_cast<std::string>(body["email"]),
                static_cast<std::string>(body["senha"]),
                static_cast<std::string>(body["departamento"]));
            if (!cadastrado) return respostaErro(409, "EMAIL_JA_CADASTRADO", "Ja existe uma conta com esse e-mail.", "email");

            crow::json::wvalue resposta;
            resposta["mensagem"] = "Conta de professor criada. Voce ja pode entrar.";
            resposta["tipo"] = "PROFESSOR";
            crow::response response(resposta);
            response.code = 201;
            return response;
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what());
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel criar a conta.");
        }
    });

    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        return crow::response(serializarUsuario(usuario));
    });

    // ---------------------------------------------
    // CRUD de usuarios: cada um gerencia a propria conta em /me;
    // o administrador consulta e remove contas de professores.
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/usuarios/me").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        return crow::response(serializarUsuario(usuario));
    });

    CROW_ROUTE(app, "/api/usuarios/me").methods(crow::HTTPMethod::PUT)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();

        auto body = crow::json::load(req.body);
        const bool ehProfessor = static_cast<bool>(std::dynamic_pointer_cast<Professor>(usuario));
        if (!body || body.t() != crow::json::type::Object ||
            !body.has("nome") || body["nome"].t() != crow::json::type::String ||
            (ehProfessor && (!body.has("departamento") ||
                             body["departamento"].t() != crow::json::type::String)) ||
            (body.has("senha") && body["senha"].t() != crow::json::type::String)) {
            return respostaErro(400, "VALIDACAO", ehProfessor
                ? "Campos obrigatorios: nome e departamento; senha e opcional."
                : "Campo obrigatorio: nome; senha e opcional.");
        }

        try {
            const bool atualizado = sistema.atualizarUsuario(
                usuario->getId(),
                static_cast<std::string>(body["nome"]),
                ehProfessor ? static_cast<std::string>(body["departamento"]) : std::string(),
                body.has("senha") ? static_cast<std::string>(body["senha"]) : std::string());
            if (!atualizado) return respostaErro(404, "USUARIO_NAO_ENCONTRADO", "Usuario nao encontrado.");

            const auto trava = sistema.travarBanco();
            auto atual = sistema.getRepositorioUsuarios().buscar(usuario->getId());
            if (!atual) return respostaErro(404, "USUARIO_NAO_ENCONTRADO", "Usuario nao encontrado.");
            return crow::response(serializarUsuario(atual));
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what());
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel atualizar a conta.");
        }
    });

    CROW_ROUTE(app, "/api/usuarios/me").methods(crow::HTTPMethod::Delete)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        const auto trava = sistema.travarBanco();
        try {
            return respostaRemocaoUsuario(sistema.removerUsuario(usuario->getId()));
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel remover a conta.");
        }
    });

    CROW_ROUTE(app, "/api/usuarios").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem listar usuarios.");
        }
        const auto trava = sistema.travarBanco();
        try {
            std::vector<crow::json::wvalue> lista;
            for (const auto& item : sistema.getRepositorioUsuarios().listarTodos()) {
                lista.push_back(serializarUsuario(item));
            }
            crow::json::wvalue corpo;
            corpo = std::move(lista);
            return crow::response(corpo);
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel listar os usuarios.");
        }
    });

    CROW_ROUTE(app, "/api/usuarios/<int>").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req, int id) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem consultar usuarios.");
        }
        const auto trava = sistema.travarBanco();
        try {
            auto encontrado = sistema.getRepositorioUsuarios().buscar(id);
            if (!encontrado) return respostaErro(404, "USUARIO_NAO_ENCONTRADO", "Usuario nao encontrado.");
            return crow::response(serializarUsuario(encontrado));
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel consultar o usuario.");
        }
    });

    CROW_ROUTE(app, "/api/usuarios/<int>").methods(crow::HTTPMethod::Delete)
    ([&sistema](const crow::request& req, int id) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem remover usuarios.");
        }
        const auto trava = sistema.travarBanco();
        try {
            return respostaRemocaoUsuario(sistema.removerUsuario(id));
        } catch (const std::exception&) {
            return respostaErro(500, "ERRO_INTERNO", "Nao foi possivel remover o usuario.");
        }
    });

    CROW_ROUTE(app, "/api/reservas/minhas").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        auto professor = std::dynamic_pointer_cast<Professor>(usuario);
        if (!professor) return respostaErro(403, "SEM_PERMISSAO", "Somente professores podem consultar suas reservas.");
        const auto trava = sistema.travarBanco();

        std::vector<std::shared_ptr<Reserva>> minhas;
        for (const auto& reserva : sistema.getRepositorioReservas().listarTodos()) {
            if (!reserva->getSolicitante() ||
                reserva->getSolicitante()->getId() != professor->getId()) continue;
            minhas.push_back(reserva);
        }
        std::sort(minhas.begin(), minhas.end(), [](const auto& a, const auto& b) {
            return a->getDataInicio() < b->getDataInicio() ||
                (a->getDataInicio() == b->getDataInicio() && a->getId() < b->getId());
        });
        std::vector<crow::json::wvalue> reservas;
        for (const auto& reserva : minhas) reservas.push_back(serializarReserva(reserva));
        crow::json::wvalue corpo;
        corpo = std::move(reservas);
        return crow::response(corpo);
    });

    CROW_ROUTE(app, "/api/reservas/pendentes").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem consultar solicitacoes.");
        }
        const auto trava = sistema.travarBanco();

        std::vector<std::shared_ptr<Reserva>> reservasPendentes;
        for (const auto& reserva : sistema.getRepositorioReservas().listarTodos()) {
            if (reserva->getStatus() != StatusReserva::PENDENTE) continue;
            reservasPendentes.push_back(reserva);
        }
        std::sort(reservasPendentes.begin(), reservasPendentes.end(), [](const auto& a, const auto& b) {
            return a->getCriadaEm() < b->getCriadaEm() ||
                (a->getCriadaEm() == b->getCriadaEm() && a->getId() < b->getId());
        });
        std::vector<crow::json::wvalue> itens;
        for (const auto& reserva : reservasPendentes) itens.push_back(serializarReserva(reserva));
        crow::json::wvalue corpo;
        corpo = std::move(itens);
        return crow::response(corpo);
    });

    CROW_ROUTE(app, "/api/reservas").methods(crow::HTTPMethod::GET)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        if (!std::dynamic_pointer_cast<Administrador>(usuario)) {
            return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem consultar todas as reservas.");
        }
        const auto trava = sistema.travarBanco();

        const char* status = req.url_params.get("status");
        const char* espacoId = req.url_params.get("espacoId");
        const char* professorId = req.url_params.get("professorId");
        const char* de = req.url_params.get("de");
        const char* ate = req.url_params.get("ate");
        const char* paginaParametro = req.url_params.get("pagina");
        const char* porPaginaParametro = req.url_params.get("porPagina");
        int pagina = 1;
        int porPagina = 20;
        int idEspaco = 0;
        int idProfessor = 0;
        try {
            if (paginaParametro) pagina = std::stoi(paginaParametro);
            if (porPaginaParametro) porPagina = std::stoi(porPaginaParametro);
            if (espacoId) idEspaco = std::stoi(espacoId);
            if (professorId) idProfessor = std::stoi(professorId);
            if (status) statusReservaFromString(status);
            if (de) Datas::diaDaData(de);
            if (ate) Datas::diaDaData(ate);
        } catch (const std::exception&) {
            return respostaErro(400, "VALIDACAO", "Filtro ou paginacao invalida.");
        }
        if (pagina < 1 || porPagina < 1 || porPagina > 1000 || idEspaco < 0 || idProfessor < 0 ||
            (de && ate && std::string(de) > std::string(ate))) {
            return respostaErro(400, "VALIDACAO", "Filtro ou paginacao invalida.");
        }

        std::vector<std::shared_ptr<Reserva>> filtradas;
        for (const auto& reserva : sistema.getRepositorioReservas().listarTodos()) {
            if (status && toString(reserva->getStatus()) != std::string(status)) continue;
            if (idEspaco && reserva->getEspaco()->getId() != idEspaco) continue;
            if (idProfessor && reserva->getSolicitante()->getId() != idProfessor) continue;
            if (de && reserva->getDataFim() < std::string(de)) continue;
            if (ate && reserva->getDataInicio() > std::string(ate)) continue;
            filtradas.push_back(reserva);
        }

        std::sort(filtradas.begin(), filtradas.end(), [](const auto& a, const auto& b) {
            return a->getDataInicio() > b->getDataInicio() ||
                (a->getDataInicio() == b->getDataInicio() && a->getId() > b->getId());
        });

        const std::size_t inicio = static_cast<std::size_t>(pagina - 1) * porPagina;
        std::vector<crow::json::wvalue> itens;
        for (std::size_t i = inicio; i < filtradas.size() && i < inicio + porPagina; ++i) {
            itens.push_back(serializarReserva(filtradas[i]));
        }
        crow::json::wvalue resposta;
        resposta["itens"] = std::move(itens);
        resposta["total"] = static_cast<int>(filtradas.size());
        return crow::response(resposta);
    });

    // ---------------------------------------------
    // POST /api/reservas - cria uma solicitacao de reserva
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        auto professor = std::dynamic_pointer_cast<Professor>(usuario);
        if (!professor) return respostaErro(403, "SEM_PERMISSAO", "Somente professores podem solicitar reservas.");
        const auto trava = sistema.travarBanco();

        auto body = crow::json::load(req.body);
        if (!body) {
            return respostaErro(400, "VALIDACAO", "JSON invalido.");
        }
        if (body.t() != crow::json::type::Object || !body.has("idEspaco") ||
            !body.has("dataInicio") || !body.has("dataFim") || !body.has("horarios")) {
            return respostaErro(400, "VALIDACAO", "Campos obrigatorios: idEspaco, dataInicio, dataFim e horarios.");
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
                return respostaErro(400, "VALIDACAO", "Tipos invalidos nos campos da reserva.");
            }

            const auto idEspaco = idEspacoJson.i();
            if (idEspaco <= 0 || idEspaco > std::numeric_limits<int>::max()) {
                return respostaErro(400, "VALIDACAO", "idEspaco invalido.", "idEspaco");
            }
            const std::string dataInicio = static_cast<std::string>(dataInicioJson);
            const std::string dataFim = static_cast<std::string>(dataFimJson);
            Datas::diaDaData(dataInicio);
            Datas::diaDaData(dataFim);
            if (dataInicio < Datas::hoje()) {
                return respostaErro(400, "VALIDACAO", "A data de inicio nao pode estar no passado.", "dataInicio");
            }
            if (dataFim < dataInicio) return respostaErro(400, "VALIDACAO", "dataFim deve ser igual ou posterior a dataInicio.", "dataFim");
            if (horariosJson.size() == 0) return respostaErro(400, "VALIDACAO", "Informe ao menos um horario.", "horarios");

            std::vector<Horario> horarios;
            for (std::size_t i = 0; i < horariosJson.size(); ++i) {
                const auto& horarioJson = horariosJson[i];
                if (horarioJson.t() != crow::json::type::Object || !horarioJson.has("dia") ||
                    !horarioJson.has("inicioMin") || !horarioJson.has("fimMin") ||
                    horarioJson["dia"].t() != crow::json::type::String ||
                    horarioJson["inicioMin"].t() != crow::json::type::Number ||
                    horarioJson["fimMin"].t() != crow::json::type::Number) {
                    return respostaErro(400, "VALIDACAO", "Cada horario requer dia, inicioMin e fimMin validos.", "horarios");
                }
                const auto inicio = horarioJson["inicioMin"].i();
                const auto fim = horarioJson["fimMin"].i();
                if (inicio < 0 || fim > 1440 || inicio >= fim) {
                    return respostaErro(400, "VALIDACAO", "Horario deve estar no intervalo de 0 a 1440 minutos e ter inicio anterior ao fim.", "horarios");
                }
                horarios.emplace_back(
                    diaSemanaFromString(static_cast<std::string>(horarioJson["dia"])),
                    static_cast<int>(inicio), static_cast<int>(fim));
            }

            for (std::size_t i = 0; i < horarios.size(); ++i) {
                for (std::size_t j = i + 1; j < horarios.size(); ++j) {
                    if (horarios[i].getDiaSemana() == horarios[j].getDiaSemana() &&
                        horarios[i].conflitaCom(horarios[j])) {
                        return respostaErro(400, "VALIDACAO", "Os horarios se sobrepoem.", "horarios");
                    }
                }
            }

            std::vector<bool> diaOcorreu(horarios.size(), false);
            std::string dataVerificada = dataInicio;
            for (std::size_t diaOffset = 0; diaOffset < 7 && dataVerificada <= dataFim; ++diaOffset) {
                const auto dia = Datas::diaDaData(dataVerificada);
                for (std::size_t i = 0; i < horarios.size(); ++i) {
                    if (horarios[i].getDiaSemana() == dia) diaOcorreu[i] = true;
                }
                dataVerificada = Datas::proximaData(dataVerificada);
            }
            if (std::find(diaOcorreu.begin(), diaOcorreu.end(), false) != diaOcorreu.end()) {
                return respostaErro(400, "VALIDACAO", "Nao ha ocorrencia de um dos dias no periodo informado.", "horarios");
            }

            espaco = sistema.getRepositorioEspacos().buscar(static_cast<int>(idEspaco));
            if (!espaco) return respostaErro(404, "ESPACO_NAO_ENCONTRADO", "Espaco nao encontrado.");
            if (espaco->isEmManutencao()) {
                return respostaErro(409, "ESPACO_EM_MANUTENCAO", "O espaco esta em manutencao.");
            }
            reserva = std::make_shared<Reserva>(0, dataInicio, dataFim, professor, espaco, std::move(horarios));
        } catch (const std::exception& erro) {
            return respostaErro(400, "VALIDACAO", erro.what());
        }

        try {
            std::vector<ConflitoReserva> conflitos;
            reserva->setCriadaEm(Datas::agoraUtc());
            if (!sistema.processarNovaReserva(reserva, &conflitos)) {
                if (!conflitos.empty()) return respostaConflitos(conflitos);
                return respostaErro(400, "VALIDACAO", "A reserva nao e valida para o periodo informado.");
            }
        } catch (const std::exception& erro) {
            return respostaErro(500, "ERRO_INTERNO", erro.what());
        }

        return crow::response(201, serializarReserva(reserva));
    });

    // ---------------------------------------------
    // POST /api/reservas/:id/aprovar
    // ---------------------------------------------
    CROW_ROUTE(app, "/api/reservas/<int>/aprovar").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req, int idReserva) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        auto administrador = std::dynamic_pointer_cast<Administrador>(usuario);
        if (!administrador) return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem aprovar reservas.");
        const auto trava = sistema.travarBanco();
        try {
            if (!administrador->aprovarReserva(sistema, idReserva)) {
                return respostaErro(409, "STATUS_INVALIDO", "A reserva nao existe ou nao esta pendente.");
            }
        } catch (const std::exception& erro) {
            return respostaErro(500, "ERRO_INTERNO", erro.what());
        }
        return crow::response(204);
    });

    CROW_ROUTE(app, "/api/reservas/<int>/rejeitar").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req, int idReserva) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        auto administrador = std::dynamic_pointer_cast<Administrador>(usuario);
        if (!administrador) return respostaErro(403, "SEM_PERMISSAO", "Somente administradores podem rejeitar reservas.");
        const auto trava = sistema.travarBanco();
        try {
            const auto motivo = lerMotivoOpcional(req);
            if (!administrador->rejeitarReserva(sistema, idReserva, motivo)) {
                return respostaErro(409, "STATUS_INVALIDO", "A reserva nao existe ou nao esta pendente.");
            }
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what(), "motivo");
        } catch (const std::exception& erro) {
            return respostaErro(500, "ERRO_INTERNO", erro.what());
        }
        return crow::response(204);
    });

    CROW_ROUTE(app, "/api/reservas/<int>/cancelar").methods(crow::HTTPMethod::POST)
    ([&sistema](const crow::request& req, int idReserva) {
        auto usuario = autenticar(req, sistema);
        if (!usuario) return respostaNaoAutorizada();
        auto professor = std::dynamic_pointer_cast<Professor>(usuario);
        if (!professor) return respostaErro(403, "SEM_PERMISSAO", "Somente professores podem cancelar reservas.");
        const auto trava = sistema.travarBanco();
        try {
            const auto motivo = lerMotivoOpcional(req);
            if (!professor->cancelarReserva(sistema, idReserva, motivo)) {
                auto reserva = sistema.getRepositorioReservas().buscar(idReserva);
                if (!reserva) return respostaErro(404, "RESERVA_NAO_ENCONTRADA", "Reserva nao encontrada.");
                if (reserva->getSolicitante()->getId() != professor->getId()) {
                    return respostaErro(403, "SEM_PERMISSAO", "A reserva pertence a outro professor.");
                }
                return respostaErro(409, "STATUS_INVALIDO", "Esta reserva nao pode mais ser cancelada.");
            }
        } catch (const std::invalid_argument& erro) {
            return respostaErro(400, "VALIDACAO", erro.what(), "motivo");
        } catch (const std::exception& erro) {
            return respostaErro(500, "ERRO_INTERNO", erro.what());
        }
        return crow::response(204);
    });

    app.bindaddr("127.0.0.1").port(18080).multithreaded().run();

    sqlite3_close(catalogoDb);
    sqlite3_close(db);
    return 0;
}
