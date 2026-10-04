#include "models/Administrador.hpp"
#include "services/SistemaDeReservas.hpp"

bool Administrador::validarPermissaoReserva(const Espaco& /*e*/) const {
    // Administrador tem permissao irrestrita para reservar/gerenciar qualquer espaco.
    return true;
}

bool Administrador::aprovarReserva(SistemaDeReservas& sistema, int idReserva) {
    return sistema.aprovarReserva(idReserva);
}

bool Administrador::rejeitarReserva(SistemaDeReservas& sistema, int idReserva, const std::string& motivo) {
    return sistema.rejeitarReserva(idReserva, motivo);
}
