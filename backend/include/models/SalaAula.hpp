#pragma once
#include "models/Espaco.hpp"

// Espaco de aula com informacoes proprias de quadro e projetor.
class SalaAula : public Espaco {
private:
    TipoQuadro tipoQuadro;
    bool possuiProjetor = false;

public:
    SalaAula() = default;
    SalaAula(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
              TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
              bool requerRetiradaChave, bool emManutencao,
              TipoQuadro tipoQuadro, bool possuiProjetor);

    std::string obterDescricaoDetalhada() const override;
    std::string tipo() const override { return "SALA_AULA"; }

    TipoQuadro getTipoQuadro() const { return tipoQuadro; }
    bool isPossuiProjetor() const { return possuiProjetor; }
};
