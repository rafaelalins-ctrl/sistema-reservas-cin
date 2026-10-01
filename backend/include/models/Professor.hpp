#pragma once
#include <memory>
#include "models/Usuario.hpp"

class Reserva;
class SistemaDeReservas;

class Professor : public Usuario {
private:
    std::string departamento;

public:
    Professor() = default;
    Professor(int id, std::string nome, std::string email, std::string senhaHash,
               std::string departamento);

    bool validarPermissaoReserva(const Espaco& e) const override;

    bool solicitarReserva(SistemaDeReservas& sistema, std::shared_ptr<Reserva> reserva);
    bool cancelarReserva(SistemaDeReservas& sistema, int idReserva);

    const std::string& getDepartamento() const { return departamento; }
};
