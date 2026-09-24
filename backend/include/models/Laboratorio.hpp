#pragma once
#include <vector>
#include "models/Espaco.hpp"

class Laboratorio : public Espaco {
private:
    int qtdComputadores = 0;
    std::vector<std::string> softwaresInstalados;

public:
    Laboratorio() = default;
    Laboratorio(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
                TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
                bool requerRetiradaChave, bool emManutencao,
                int qtdComputadores, std::vector<std::string> softwaresInstalados);

    std::string obterDescricaoDetalhada() const override;
    std::string tipo() const override { return "LABORATORIO"; }

    int getQtdComputadores() const { return qtdComputadores; }
    const std::vector<std::string>& getSoftwaresInstalados() const { return softwaresInstalados; }
};
