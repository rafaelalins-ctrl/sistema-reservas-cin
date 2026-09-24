#pragma once
#include <string>

// ==========================================
// ENUMS DE INFRAESTRUTURA E DOMINIO
// ==========================================

enum class BlocoCIn { BLOCO_A, BLOCO_B, BLOCO_C, BLOCO_D, BLOCO_E, AREA_2 };
enum class TipoMobilia { FIXA_ANFITEATRO, CADEIRAS_MOVEIS, BANCADA_LAB };
enum class TipoQuadro { BRANCO, VIDRO };
enum class DiaSemana { SEGUNDA, TERCA, QUARTA, QUINTA, SEXTA, SABADO, DOMINGO };
enum class StatusReserva { PENDENTE, APROVADA, REJEITADA, CANCELADA };

// Conversao string <-> enum (util para JSON e SQLite)
const char* toString(BlocoCIn bloco);
const char* toString(TipoMobilia mobilia);
const char* toString(TipoQuadro tipo);
const char* toString(DiaSemana dia);
const char* toString(StatusReserva status);

BlocoCIn blocoFromString(const std::string& s);
TipoMobilia tipoMobiliaFromString(const std::string& s);
TipoQuadro tipoQuadroFromString(const std::string& s);
DiaSemana diaSemanaFromString(const std::string& s);
StatusReserva statusReservaFromString(const std::string& s);
