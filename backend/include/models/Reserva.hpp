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
// Liga um professor a um espaco durante um periodo e horarios semanais.
class Reserva {
private:
    int id = 0;
    std::string dataInicio; // formato ISO 8601: "YYYY-MM-DD"
    std::string dataFim;
    // Preenchidos pela API ao criar/decidir o pedido.
    std::string criadaEm;
    std::string motivo;
    StatusReserva status = StatusReserva::PENDENTE;

    // A reserva mantem as entidades associadas enquanto estiver em uso.
    std::shared_ptr<Professor> solicitante;
    std::shared_ptr<Espaco> espaco;
    std::vector<Horario> horarios;

public:
    Reserva() = default;
    Reserva(int id, std::string dataInicio, std::string dataFim,
             std::shared_ptr<Professor> solicitante, std::shared_ptr<Espaco> espaco,
             std::vector<Horario> horarios);

    // Mudam so o estado em memoria; quem grava no banco e o RepositorioReserva,
    // que tambem confere se a transicao e permitida (ex.: so aprova se PENDENTE).
    void aprovar();
    void rejeitar();
    void cancelar();

    int getId() const { return id; }
    const std::string& getDataInicio() const { return dataInicio; }
    const std::string& getDataFim() const { return dataFim; }
    const std::string& getCriadaEm() const { return criadaEm; }
    const std::string& getMotivo() const { return motivo; }
    StatusReserva getStatus() const { return status; }
    const std::shared_ptr<Professor>& getSolicitante() const { return solicitante; }
    const std::shared_ptr<Espaco>& getEspaco() const { return espaco; }
    const std::vector<Horario>& getHorarios() const { return horarios; }

    void setId(int novoId) { id = novoId; }
    void setCriadaEm(std::string valor) { criadaEm = std::move(valor); }
    void setMotivo(std::string valor) { motivo = std::move(valor); }
    void setStatus(StatusReserva novoStatus) { status = novoStatus; }
};
