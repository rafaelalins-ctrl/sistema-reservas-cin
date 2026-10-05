#include "models/Auditorio.hpp"
#include <sstream>

// A parte comum e inicializada pelo construtor da classe base Espaco;
// so os atributos proprios ficam aqui.
Auditorio::Auditorio(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
                      TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
                      bool requerRetiradaChave, bool emManutencao,
                      bool equipamentoSom, bool cabineTraducao)
    : Espaco(id, std::move(identificacao), capacidade, bloco, mobilia, qtdTomadas,
             acessivelCadeirante, requerRetiradaChave, emManutencao),
      equipamentoSom(equipamentoSom), cabineTraducao(cabineTraducao) {}

// Versao de Auditorio do metodo polimorfico: a API chama obterDescricaoDetalhada()
// num shared_ptr<Espaco> e esta implementacao e escolhida em tempo de execucao.
std::string Auditorio::obterDescricaoDetalhada() const {
    std::ostringstream out;
    out << "Auditorio " << getIdentificacao()
        << " | Capacidade: " << getCapacidade()
        << " | Som: " << (equipamentoSom ? "Sim" : "Nao")
        << " | Cabine de traducao: " << (cabineTraducao ? "Sim" : "Nao");
    return out.str();
}
