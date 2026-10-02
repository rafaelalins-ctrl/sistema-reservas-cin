#include "models/Professor.hpp"
#include "models/Espaco.hpp"
#include <utility>

Professor::Professor(int id, std::string nome, std::string email, std::string senhaHash,
                     std::string departamento)
    : Usuario(id, std::move(nome), std::move(email), std::move(senhaHash)),
      departamento(std::move(departamento)) {}

bool Professor::validarPermissaoReserva(const Espaco& e) const {
    // não permite reserva se o espaço estiver em manutenção
    return !e.isEmManutencao();
}

void Professor::solicitarReserva() {
    // TODO: Delegar para SistemaDeReservas / RepositorioReserva
}

void Professor::cancelarReserva() {
    // TODO: Delegar para SistemaDeReservas / RepositorioReserva
}