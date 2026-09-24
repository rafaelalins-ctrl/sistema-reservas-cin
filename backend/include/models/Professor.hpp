#pragma once
#include "models/Usuario.hpp"

class Professor : public Usuario {
private:
    std::string departamento;

public:
    Professor() = default;
    Professor(int id, std::string nome, std::string email, std::string senhaHash,
               std::string departamento);

    bool validarPermissaoReserva(const Espaco& e) const override;

    void solicitarReserva();
    void cancelarReserva();

    const std::string& getDepartamento() const { return departamento; }
};
