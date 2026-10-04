#pragma once

#include <sqlite3.h>
#include "crow.h"
#include "services/SistemaDeReservas.hpp"

namespace Rotas {
void registrarEspacos(crow::SimpleApp& app, SistemaDeReservas& sistema,
                      sqlite3* db, sqlite3* catalogoDb);
void registrarAutenticacao(crow::SimpleApp& app, SistemaDeReservas& sistema);
void registrarReservas(crow::SimpleApp& app, SistemaDeReservas& sistema);
}