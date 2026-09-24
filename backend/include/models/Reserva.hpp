#pragma once
#include <memory>
#include <string>
#include <vector>
#include "models/Enums.hpp"
#include "models/Horario.hpp"

class Professor;
class Espaco;

// ==========================================
// ENTIDADE: RESERVA
// ==========================================
class Reserva {
private:
    int id = 0;
    std::string dataInicio; // formato ISO 8601: "YYYY-MM-DD"
    std::string dataFim;
    StatusReserva status = StatusReserva::PENDENTE;

    std::shared_ptr<Professor> solicitante;
    std::shared_ptr<Espaco> espaco;
    std::vector<Horario> horarios;

public:
    Reserva() = default;
    Reserva(int id, std::string dataInicio, std::string dataFim,
             std::shared_ptr<Professor> solicitante, std::shared_ptr<Espaco> espaco,
             std::vector<Horario> horarios);

    void aprovar();
    void rejeitar();
    void cancelar();

    int getId() const { return id; }
    const std::string& getDataInicio() const { return dataInicio; }
    const std::string& getDataFim() const { return dataFim; }
    StatusReserva getStatus() const { return status; }
    const std::shared_ptr<Professor>& getSolicitante() const { return solicitante; }
    const std::shared_ptr<Espaco>& getEspaco() const { return espaco; }
    const std::vector<Horario>& getHorarios() const { return horarios; }

    void setId(int novoId) { id = novoId; }
};
