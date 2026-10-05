#pragma once
#include <string>
#include "models/Enums.hpp"

// ==========================================
// BLOCO DE ESPACOS (POLIMORFISMO DE EXIBICAO)
// ==========================================
// Classe abstrata: tem metodos virtuais puros, entao so existem objetos de
// SalaAula, Laboratorio ou Auditorio. O resto do sistema usa Espaco& ou
// shared_ptr<Espaco> e nao precisa saber qual e o tipo concreto.
class Espaco {
protected:
    // Informacoes compartilhadas por salas, laboratorios e auditorios.
    // protected: as subclasses acessam direto; o restante do codigo usa os getters.
    int id = 0;
    std::string identificacao;
    int capacidade = 0;
    BlocoCIn bloco;
    TipoMobilia mobilia;
    int qtdTomadas = 0;
    bool acessivelCadeirante = false;
    bool requerRetiradaChave = false;
    bool emManutencao = false;

public:
    Espaco() = default;
    Espaco(int id, std::string identificacao, int capacidade, BlocoCIn bloco,
           TipoMobilia mobilia, int qtdTomadas, bool acessivelCadeirante,
           bool requerRetiradaChave, bool emManutencao);

    // Virtual para que destruir via shared_ptr<Espaco> libere tambem a parte da subclasse.
    virtual ~Espaco() = default;

    // Cada subtipo monta uma descricao com suas caracteristicas.
    virtual std::string obterDescricaoDetalhada() const = 0;

    // Identifica o "tipo" concreto, usado pelo RepositorioEspaco para
    // persistir/reconstruir o objeto correto a partir do banco.
    virtual std::string tipo() const = 0;

    // Getters
    int getId() const { return id; }
    const std::string& getIdentificacao() const { return identificacao; }
    int getCapacidade() const { return capacidade; }
    BlocoCIn getBloco() const { return bloco; }
    TipoMobilia getMobilia() const { return mobilia; }
    int getQtdTomadas() const { return qtdTomadas; }
    bool isAcessivelCadeirante() const { return acessivelCadeirante; }
    bool isRequerRetiradaChave() const { return requerRetiradaChave; }
    bool isEmManutencao() const { return emManutencao; }

    // Setters basicos usados pelo repositorio ao popular o objeto
    void setId(int novoId) { id = novoId; }
    void setEmManutencao(bool valor) { emManutencao = valor; }
};
