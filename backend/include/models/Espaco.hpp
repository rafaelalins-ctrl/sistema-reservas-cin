#pragma once
#include <string>
#include "models/Enums.hpp"

// ==========================================
// BLOCO DE ESPACOS (POLIMORFISMO DE EXIBICAO)
// ==========================================
class Espaco {
protected:
    int id = 0;
    std::string codigo;
    std::string tipoArmazenado;
    std::string identificacao;
    int capacidade = 0;
    BlocoCIn bloco;
    std::string andar;
    std::string detalhes;
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

    virtual ~Espaco() = default;

    // Metodo polimorfico central: cada subtipo descreve a si mesmo
    virtual std::string obterDescricaoDetalhada() const = 0;

    // Identifica o "tipo" concreto, usado pelo RepositorioEspaco para
    // persistir/reconstruir o objeto correto a partir do banco.
    virtual std::string tipo() const = 0;

    // Getters
    int getId() const { return id; }
    const std::string& getCodigo() const { return codigo; }
    const std::string& getTipoArmazenado() const { return tipoArmazenado; }
    const std::string& getIdentificacao() const { return identificacao; }
    int getCapacidade() const { return capacidade; }
    BlocoCIn getBloco() const { return bloco; }
    const std::string& getAndar() const { return andar; }
    const std::string& getDetalhes() const { return detalhes; }
    TipoMobilia getMobilia() const { return mobilia; }
    int getQtdTomadas() const { return qtdTomadas; }
    bool isAcessivelCadeirante() const { return acessivelCadeirante; }
    bool isRequerRetiradaChave() const { return requerRetiradaChave; }
    bool isEmManutencao() const { return emManutencao; }

    // Setters basicos usados pelo repositorio ao popular o objeto
    void setId(int novoId) { id = novoId; }
    void setCodigo(std::string novoCodigo) { codigo = std::move(novoCodigo); }
    void setTipoArmazenado(std::string novoTipo) { tipoArmazenado = std::move(novoTipo); }
    void setAndar(std::string novoAndar) { andar = std::move(novoAndar); }
    void setDetalhes(std::string novosDetalhes) { detalhes = std::move(novosDetalhes); }
    void setEmManutencao(bool valor) { emManutencao = valor; }
};
