#pragma once
#include "models/Usuario.hpp"

class Administrador : public Usuario {
public:
    using Usuario::Usuario;

    bool validarPermissaoReserva(const Espaco& e) const override;

    // Acoes exclusivas do administrador sobre reservas pendentes.
    // Implementadas via SistemaDeReservas/RepositorioReserva (assinatura de exemplo).
    void aprovarReserva(int idReserva);
    void rejeitarReserva(int idReserva);
};
