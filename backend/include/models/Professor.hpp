#pragma once
#include <memory>
#include "models/Usuario.hpp"

class Reserva;
class SistemaDeReservas;

// Usuario que pode solicitar reservas e cancelar as proprias.
class Professor : public Usuario {
private:
    std::string departamento;

public:
    Professor() = default;
    Professor(int id, std::string nome, std::string email, std::string senhaHash,
               std::string departamento);

    bool validarPermissaoReserva(const Espaco& e) const override;
    std::string tipo() const override { return "PROFESSOR"; }

    bool solicitarReserva(SistemaDeReservas& sistema, std::shared_ptr<Reserva> reserva);
    bool cancelarReserva(SistemaDeReservas& sistema, int idReserva,
                         const std::string& motivo = "");

    const std::string& getDepartamento() const { return departamento; }
    void setDepartamento(std::string novoDepartamento) { departamento = std::move(novoDepartamento); }
};
