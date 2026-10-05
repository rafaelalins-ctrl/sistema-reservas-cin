#pragma once
#include "models/Usuario.hpp"

class SistemaDeReservas;

// Usuario responsavel por aprovar/rejeitar pedidos e gerenciar espacos.
class Administrador : public Usuario {
public:
    // Herda os construtores de Usuario: o administrador nao tem atributos proprios.
    using Usuario::Usuario;

    // Administrador pode reservar qualquer espaco, inclusive em manutencao.
    bool validarPermissaoReserva(const Espaco& e) const override;
    std::string tipo() const override { return "ADMINISTRADOR"; }

    // Acoes exclusivas do administrador sobre reservas pendentes.
    bool aprovarReserva(SistemaDeReservas& sistema, int idReserva);
    bool rejeitarReserva(SistemaDeReservas& sistema, int idReserva,
                         const std::string& motivo = "");
};
