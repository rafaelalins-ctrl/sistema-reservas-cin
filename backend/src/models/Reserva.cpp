#include "models/Reserva.hpp"

Reserva::Reserva(int id, std::string dataInicio, std::string dataFim,
                  std::shared_ptr<Professor> solicitante, std::shared_ptr<Espaco> espaco,
                  std::vector<Horario> horarios)
    : id(id), dataInicio(std::move(dataInicio)), dataFim(std::move(dataFim)),
      solicitante(std::move(solicitante)), espaco(std::move(espaco)),
      horarios(std::move(horarios)) {}

void Reserva::aprovar() { status = StatusReserva::APROVADA; }
void Reserva::rejeitar() { status = StatusReserva::REJEITADA; }
void Reserva::cancelar() { status = StatusReserva::CANCELADA; }
