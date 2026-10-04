#include "models/Professor.hpp"
#include "models/Espaco.hpp"
#include "models/Reserva.hpp"
#include "services/SistemaDeReservas.hpp"

Professor::Professor(int id, std::string nome, std::string email, std::string senhaHash,
                     std::string departamento)
    : Usuario(id, std::move(nome), std::move(email), std::move(senhaHash)),
      departamento(std::move(departamento)) {}

bool Professor::validarPermissaoReserva(const Espaco& e) const {
    // Regra de exemplo: professor nao pode reservar espacos em manutencao.

    return !e.isEmManutencao();
}

bool Professor::solicitarReserva(SistemaDeReservas& sistema, std::shared_ptr<Reserva> reserva) {
    if (!reserva || !reserva->getSolicitante() || reserva->getSolicitante()->getId() != getId()) {
        return false;
    }
    return sistema.processarNovaReserva(reserva);
}

bool Professor::cancelarReserva(SistemaDeReservas& sistema, int idReserva) {
    return sistema.cancelarReserva(idReserva, getId());
}
