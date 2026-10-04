#pragma once
#include "models/Espaco.hpp"

// Espaco para eventos, com recursos de som e traducao.
class Auditorio : public Espaco {
private:
    bool equipamentoSom = false;
    bool cabineTraducao = false;

public:
    Auditorio() = default;
    Auditorio(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
              TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
              bool requerRetiradaChave, bool emManutencao,
              bool equipamentoSom, bool cabineTraducao);

    std::string obterDescricaoDetalhada() const override;
    std::string tipo() const override { return "AUDITORIO"; }

    bool isEquipamentoSom() const { return equipamentoSom; }
    bool isCabineTraducao() const { return cabineTraducao; }
};
