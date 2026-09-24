#include "models/Auditorio.hpp"
#include <sstream>

Auditorio::Auditorio(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
                      TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
                      bool requerRetiradaChave, bool emManutencao,
                      bool equipamentoSom, bool cabineTraducao)
    : Espaco(id, std::move(identificacao), capacidade, bloco, mobilia, qtdTomadas,
             acessivelCadeirante, requerRetiradaChave, emManutencao),
      equipamentoSom(equipamentoSom), cabineTraducao(cabineTraducao) {}

std::string Auditorio::obterDescricaoDetalhada() const {
    std::ostringstream out;
    out << "Auditorio " << getIdentificacao()
        << " | Capacidade: " << getCapacidade()
        << " | Som: " << (equipamentoSom ? "Sim" : "Nao")
        << " | Cabine de traducao: " << (cabineTraducao ? "Sim" : "Nao");
    return out.str();
}
