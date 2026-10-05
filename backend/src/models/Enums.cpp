#include "models/Enums.hpp"
#include <stdexcept>

// Os textos sao os mesmos gravados no banco e trocados com o frontend;
// mudar um deles quebra dados ja salvos.

const char* toString(BlocoCIn bloco) {
    switch (bloco) {
        case BlocoCIn::BLOCO_A: return "BLOCO_A";
        case BlocoCIn::BLOCO_B: return "BLOCO_B";
        case BlocoCIn::BLOCO_C: return "BLOCO_C";
        case BlocoCIn::BLOCO_D: return "BLOCO_D";
        case BlocoCIn::BLOCO_E: return "BLOCO_E";
        case BlocoCIn::AREA_2:  return "AREA_2";
    }
    return "BLOCO_A";
}

const char* toString(TipoMobilia mobilia) {
    switch (mobilia) {
        case TipoMobilia::FIXA_ANFITEATRO: return "FIXA_ANFITEATRO";
        case TipoMobilia::CADEIRAS_MOVEIS: return "CADEIRAS_MOVEIS";
        case TipoMobilia::BANCADA_LAB:     return "BANCADA_LAB";
    }
    return "CADEIRAS_MOVEIS";
}

const char* toString(TipoQuadro tipo) {
    switch (tipo) {
        case TipoQuadro::BRANCO: return "BRANCO";
        case TipoQuadro::VIDRO:  return "VIDRO";
    }
    return "BRANCO";
}

const char* toString(DiaSemana dia) {
    switch (dia) {
        case DiaSemana::SEGUNDA: return "SEGUNDA";
        case DiaSemana::TERCA:   return "TERCA";
        case DiaSemana::QUARTA:  return "QUARTA";
        case DiaSemana::QUINTA:  return "QUINTA";
        case DiaSemana::SEXTA:   return "SEXTA";
        case DiaSemana::SABADO:  return "SABADO";
        case DiaSemana::DOMINGO: return "DOMINGO";
    }
    return "SEGUNDA";
}

const char* toString(StatusReserva status) {
    switch (status) {
        case StatusReserva::PENDENTE:  return "PENDENTE";
        case StatusReserva::APROVADA:  return "APROVADA";
        case StatusReserva::REJEITADA: return "REJEITADA";
        case StatusReserva::CANCELADA: return "CANCELADA";
    }
    return "PENDENTE";
}

BlocoCIn blocoFromString(const std::string& s) {
    if (s == "BLOCO_A") return BlocoCIn::BLOCO_A;
    if (s == "BLOCO_B") return BlocoCIn::BLOCO_B;
    if (s == "BLOCO_C") return BlocoCIn::BLOCO_C;
    if (s == "BLOCO_D") return BlocoCIn::BLOCO_D;
    if (s == "BLOCO_E") return BlocoCIn::BLOCO_E;
    if (s == "AREA_2")  return BlocoCIn::AREA_2;
    throw std::invalid_argument("BlocoCIn invalido: " + s);
}

TipoMobilia tipoMobiliaFromString(const std::string& s) {
    if (s == "FIXA_ANFITEATRO") return TipoMobilia::FIXA_ANFITEATRO;
    if (s == "CADEIRAS_MOVEIS") return TipoMobilia::CADEIRAS_MOVEIS;
    if (s == "BANCADA_LAB")     return TipoMobilia::BANCADA_LAB;
    throw std::invalid_argument("TipoMobilia invalido: " + s);
}

TipoQuadro tipoQuadroFromString(const std::string& s) {
    if (s == "BRANCO") return TipoQuadro::BRANCO;
    if (s == "VIDRO")  return TipoQuadro::VIDRO;
    throw std::invalid_argument("TipoQuadro invalido: " + s);
}

DiaSemana diaSemanaFromString(const std::string& s) {
    if (s == "SEGUNDA") return DiaSemana::SEGUNDA;
    if (s == "TERCA")   return DiaSemana::TERCA;
    if (s == "QUARTA")  return DiaSemana::QUARTA;
    if (s == "QUINTA")  return DiaSemana::QUINTA;
    if (s == "SEXTA")   return DiaSemana::SEXTA;
    if (s == "SABADO")  return DiaSemana::SABADO;
    if (s == "DOMINGO") return DiaSemana::DOMINGO;
    throw std::invalid_argument("DiaSemana invalido: " + s);
}

StatusReserva statusReservaFromString(const std::string& s) {
    if (s == "PENDENTE")  return StatusReserva::PENDENTE;
    if (s == "APROVADA")  return StatusReserva::APROVADA;
    if (s == "REJEITADA") return StatusReserva::REJEITADA;
    if (s == "CANCELADA") return StatusReserva::CANCELADA;
    throw std::invalid_argument("StatusReserva invalido: " + s);
}
