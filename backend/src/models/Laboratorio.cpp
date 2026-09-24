#include "models/Laboratorio.hpp"
#include <sstream>

Laboratorio::Laboratorio(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
                          TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
                          bool requerRetiradaChave, bool emManutencao,
                          int qtdComputadores, std::vector<std::string> softwaresInstalados)
    : Espaco(id, std::move(identificacao), capacidade, bloco, mobilia, qtdTomadas,
             acessivelCadeirante, requerRetiradaChave, emManutencao),
      qtdComputadores(qtdComputadores), softwaresInstalados(std::move(softwaresInstalados)) {}

std::string Laboratorio::obterDescricaoDetalhada() const {
    std::ostringstream out;
    out << "Laboratorio " << getIdentificacao()
        << " | Computadores: " << qtdComputadores
        << " | Softwares: " << softwaresInstalados.size();
    return out.str();
}
