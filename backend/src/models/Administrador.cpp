#include "models/Administrador.hpp"

bool Administrador::validarPermissaoReserva(const Espaco& /*e*/) const {
    // Administrador tem permissao irrestrita para reservar/gerenciar qualquer espaco.
    return true;
}

void Administrador::aprovarReserva(int /*idReserva*/) {
    // TODO: delegar para SistemaDeReservas -> RepositorioReserva::atualizar(status=APROVADA)
}

void Administrador::rejeitarReserva(int /*idReserva*/) {
    // TODO: delegar para SistemaDeReservas -> RepositorioReserva::atualizar(status=REJEITADA)
}
