#include "services/SistemaDeReservas.hpp"
#include "models/Professor.hpp"

bool SistemaDeReservas::verificarDisponibilidade(const Espaco& e, const Horario& h,
                                                   const std::string& data) {
    auto reservasExistentes = repoReservas.listarPorEspacoEData(e.getId(), data);
    for (const auto& reserva : reservasExistentes) {
        if (reserva->getStatus() == StatusReserva::CANCELADA ||
            reserva->getStatus() == StatusReserva::REJEITADA) {
            continue;
        }
        for (const auto& horarioExistente : reserva->getHorarios()) {
            if (horarioExistente.conflitaCom(h)) {
                return false;
            }
        }
    }
    return true;
}

std::vector<std::shared_ptr<Espaco>> SistemaDeReservas::listarEspacosDisponiveis(
    const Horario& h, const std::string& data, int capMinima) {
    std::vector<std::shared_ptr<Espaco>> disponiveis;
    for (const auto& espaco : repoEspacos.listarTodos()) {
        if (espaco->isEmManutencao()) continue;
        if (espaco->getCapacidade() < capMinima) continue;
        if (verificarDisponibilidade(*espaco, h, data)) {
            disponiveis.push_back(espaco);
        }
    }
    return disponiveis;
}

bool SistemaDeReservas::processarNovaReserva(std::shared_ptr<Reserva> r) {
    if (!r || !r->getEspaco() || !r->getSolicitante()) return false;

    if (!r->getSolicitante()->validarPermissaoReserva(*r->getEspaco())) {
        return false;
    }

    for (const auto& horario : r->getHorarios()) {
        if (!verificarDisponibilidade(*r->getEspaco(), horario, r->getDataInicio())) {
            return false;
        }
    }

    repoReservas.salvar(r);
    return true;
}

bool SistemaDeReservas::alterarHorarioReserva(int idReserva, std::vector<Horario> novosHorarios) {
    auto reserva = repoReservas.buscar(idReserva);
    if (!reserva) return false;

    for (const auto& horario : novosHorarios) {
        if (!verificarDisponibilidade(*reserva->getEspaco(), horario, reserva->getDataInicio())) {
            return false;
        }
    }

    // TODO: substituir os horarios da reserva e persistir (ver RepositorioReserva).
    repoReservas.atualizar(reserva);
    return true;
}

void SistemaDeReservas::removerEspacoDoSistema(int idEspaco) {
    repoEspacos.remover(idEspaco);
}
