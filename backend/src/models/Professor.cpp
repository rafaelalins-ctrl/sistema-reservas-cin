#include "models/Professor.hpp"
#include "models/Espaco.hpp"

Professor::Professor(int id, std::string nome, std::string email, std::string senhaHash,
                      std::string departamento)
    : Usuario(id, std::move(nome), std::move(email), std::move(senhaHash)),
      departamento(std::move(departamento)) {}

bool Professor::validarPermissaoReserva(const Espaco& e) const {
    // Regra de exemplo: professor nao pode reservar espacos em manutencao.
    // TODO: adicionar regras adicionais (ex: laboratorios restritos ao departamento).
    return !e.isEmManutencao();
}

void Professor::solicitarReserva() {
    // TODO: delegar para SistemaDeReservas::processarNovaReserva
}

void Professor::cancelarReserva() {
    // TODO: delegar para SistemaDeReservas -> RepositorioReserva::atualizar(status=CANCELADA)
}
