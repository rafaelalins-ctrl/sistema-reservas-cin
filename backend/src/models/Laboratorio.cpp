#include "models/Laboratorio.hpp"
#include <sstream>

// A parte comum e inicializada pelo construtor da classe base Espaco;
// so os atributos proprios ficam aqui.
Laboratorio::Laboratorio(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
                          TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
                          bool requerRetiradaChave, bool emManutencao,
                          int qtdComputadores, std::vector<std::string> softwaresInstalados)
    : Espaco(id, std::move(identificacao), capacidade, bloco, mobilia, qtdTomadas,
             acessivelCadeirante, requerRetiradaChave, emManutencao),
      qtdComputadores(qtdComputadores), softwaresInstalados(std::move(softwaresInstalados)) {}

// Versao de Laboratorio do metodo polimorfico: a API chama obterDescricaoDetalhada()
// num shared_ptr<Espaco> e esta implementacao e escolhida em tempo de execucao.
std::string Laboratorio::obterDescricaoDetalhada() const {
    std::ostringstream out;
    out << "Laboratorio " << getIdentificacao()
        << " | Computadores: " << qtdComputadores
        << " | Softwares: " << softwaresInstalados.size();
    return out.str();
}
