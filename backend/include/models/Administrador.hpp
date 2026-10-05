#pragma once
#include "models/Usuario.hpp"

class SistemaDeReservas;

// Usuario responsavel por aprovar/rejeitar pedidos e gerenciar espacos.
class Administrador : public Usuario {
public:
    using Usuario::Usuario;

    bool validarPermissaoReserva(const Espaco& e) const override;
    std::string tipo() const override { return "ADMINISTRADOR"; }

    // Acoes exclusivas do administrador sobre reservas pendentes.
    bool aprovarReserva(SistemaDeReservas& sistema, int idReserva);
    bool rejeitarReserva(SistemaDeReservas& sistema, int idReserva,
                         const std::string& motivo = "");
};
