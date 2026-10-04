#pragma once

#include <memory>
#include <string>
#include <vector>
#include "crow.h"
#include "services/SistemaDeReservas.hpp"

namespace ApiHttp {
DiaSemana diaDaData(const std::string& data);
std::string proximaData(const std::string& data);
std::string dataHoje();
std::string dataHoraUtc();
std::shared_ptr<Usuario> autenticar(const crow::request& req, SistemaDeReservas& sistema);
crow::response respostaNaoAutorizada();
crow::response respostaErro(int status, const std::string& codigo,
                            const std::string& mensagem, const std::string& campo = "");
crow::response respostaConflitos(const std::vector<ConflitoReserva>& conflitos);
std::string lerMotivoOpcional(const crow::request& req);
crow::json::wvalue serializarEspaco(const std::shared_ptr<Espaco>& espaco);
std::shared_ptr<Espaco> construirEspaco(const crow::json::rvalue& corpo, int id = 0);
bool identificacaoEmUso(SistemaDeReservas& sistema, const std::string& identificacao,
                        int ignorarId = 0);
void semearEspacosMock(SistemaDeReservas& sistema, sqlite3* catalogoDb);
crow::json::wvalue serializarReserva(const std::shared_ptr<Reserva>& reserva);
}