#include "models/SalaAula.hpp"
#include <sstream>

// A parte comum e inicializada pelo construtor da classe base Espaco;
// so os atributos proprios ficam aqui.
SalaAula::SalaAula(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
                    TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
                    bool requerRetiradaChave, bool emManutencao,
                    TipoQuadro tipoQuadro, bool possuiProjetor)
    : Espaco(id, std::move(identificacao), capacidade, bloco, mobilia, qtdTomadas,
             acessivelCadeirante, requerRetiradaChave, emManutencao),
      tipoQuadro(tipoQuadro), possuiProjetor(possuiProjetor) {}

// Versao de SalaAula do metodo polimorfico: a API chama obterDescricaoDetalhada()
// num shared_ptr<Espaco> e esta implementacao e escolhida em tempo de execucao.
std::string SalaAula::obterDescricaoDetalhada() const {
    std::ostringstream out;
    out << "Sala de Aula " << getIdentificacao()
        << " | Capacidade: " << getCapacidade()
        << " | Quadro: " << toString(tipoQuadro)
        << " | Projetor: " << (possuiProjetor ? "Sim" : "Nao");
    return out.str();
}
