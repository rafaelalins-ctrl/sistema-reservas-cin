#include "models/Espaco.hpp"

// Construtor chamado pelas subclasses; Espaco sozinho nao pode ser instanciado.
Espaco::Espaco(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
               TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
               bool requerRetiradaChave, bool emManutencao)
    : id(id), identificacao(std::move(identificacao)), capacidade(capacidade),
      bloco(bloco), mobilia(mobilia), qtdTomadas(qtdTomadas),
      acessivelCadeirante(acessivelCadeirante), requerRetiradaChave(requerRetiradaChave),
      emManutencao(emManutencao) {}
