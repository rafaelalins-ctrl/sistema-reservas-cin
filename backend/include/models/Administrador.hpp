#pragma once
#include "models/Usuario.hpp"

class SistemaDeReservas;

class Administrador : public Usuario {
public:
    using Usuario::Usuario;

    bool validarPermissaoReserva(const Espaco& e) const override;

    // Acoes exclusivas do administrador sobre reservas pendentes.
    bool aprovarReserva(SistemaDeReservas& sistema, int idReserva);
    bool rejeitarReserva(SistemaDeReservas& sistema, int idReserva);
};
