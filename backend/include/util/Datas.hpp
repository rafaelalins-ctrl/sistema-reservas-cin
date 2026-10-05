#pragma once
#include <string>
#include "models/Enums.hpp"

// Datas no formato AAAA-MM-DD, compartilhadas pelas rotas e pelo servico.
namespace Datas {
// Dia da semana de uma data valida; lanca std::invalid_argument se a data for invalida.
DiaSemana diaDaData(const std::string& data);
// Dia seguinte a uma data valida.
std::string proximaData(const std::string& data);
// Data de hoje no fuso local.
std::string hoje();
// Instante atual em UTC, no formato ISO 8601 (AAAA-MM-DDTHH:MM:SSZ).
std::string agoraUtc();
}
