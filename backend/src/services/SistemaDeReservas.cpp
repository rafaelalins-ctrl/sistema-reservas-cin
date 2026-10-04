#include "services/SistemaDeReservas.hpp"
#include "models/Professor.hpp"
#include <algorithm>
#include <ctime>
#include <cctype>
#include <iomanip>
#include <sstream>

namespace {
DiaSemana diaDaData(const std::string& data) {
    std::tm partes{};
    std::istringstream entrada(data);
    entrada >> std::get_time(&partes, "%Y-%m-%d");
    if (entrada.fail() || entrada.peek() != std::char_traits<char>::eof()) {
        throw std::invalid_argument("Data deve usar o formato AAAA-MM-DD.");
    }
    partes.tm_hour = 12;
    partes.tm_isdst = -1;
    if (std::mktime(&partes) == -1) throw std::invalid_argument("Data invalida.");
    char normalizada[11];
    std::strftime(normalizada, sizeof(normalizada), "%Y-%m-%d", &partes);
    if (data != normalizada) throw std::invalid_argument("Data invalida.");
    return static_cast<DiaSemana>((partes.tm_wday + 6) % 7);
}

std::string proximaData(const std::string& data) {
    std::tm partes{};
    std::istringstream entrada(data);
    entrada >> std::get_time(&partes, "%Y-%m-%d");
    partes.tm_hour = 12;
    partes.tm_mday += 1;
    partes.tm_isdst = -1;
    if (std::mktime(&partes) == -1) throw std::invalid_argument("Data invalida.");
    char proxima[11];
    std::strftime(proxima, sizeof(proxima), "%Y-%m-%d", &partes);
    return proxima;
}

std::string aparar(const std::string& valor) {
    const auto inicio = valor.find_first_not_of(" \t\r\n");
    if (inicio == std::string::npos) return {};
    const auto fim = valor.find_last_not_of(" \t\r\n");
    return valor.substr(inicio, fim - inicio + 1);
}

std::string normalizarEmail(const std::string& email) {
    std::string normalizado = aparar(email);
    std::transform(normalizado.begin(), normalizado.end(), normalizado.begin(), [](unsigned char caractere) {
        return static_cast<char>(std::tolower(caractere));
    });
    return normalizado;
}
}

bool SistemaDeReservas::verificarDisponibilidade(const Espaco& e, const Horario& h,
                                                   const std::string& data, int idReservaIgnorada) {
    auto reservasExistentes = repoReservas.listarPorEspacoEData(
        e.getId(), data, idReservaIgnorada);
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
    if (r->getDataFim() < r->getDataInicio() || r->getHorarios().empty()) return false;

    if (!r->getSolicitante()->validarPermissaoReserva(*r->getEspaco())) {
        return false;
    }

    if (!horariosDisponiveis(*r->getEspaco(), r->getHorarios(),
                             r->getDataInicio(), r->getDataFim())) return false;

    repoReservas.salvar(r);
    return true;
}

bool SistemaDeReservas::horariosDisponiveis(
    const Espaco& espaco, const std::vector<Horario>& horarios,
    const std::string& dataInicio, const std::string& dataFim, int idReservaIgnorada) {
    if (horarios.empty() || dataFim < dataInicio) return false;
    diaDaData(dataInicio);
    diaDaData(dataFim);

    for (std::size_t i = 0; i < horarios.size(); ++i) {
        for (std::size_t j = i + 1; j < horarios.size(); ++j) {
            if (horarios[i].conflitaCom(horarios[j])) return false;
        }
    }

    std::vector<bool> horarioOcorreu(horarios.size(), false);
    for (std::string data = dataInicio; data <= dataFim; data = proximaData(data)) {
        const auto dia = diaDaData(data);
        for (std::size_t i = 0; i < horarios.size(); ++i) {
            if (horarios[i].getDiaSemana() == dia) {
                horarioOcorreu[i] = true;
                if (!verificarDisponibilidade(espaco, horarios[i], data, idReservaIgnorada)) {
                    return false;
                }
            }
        }
    }
    return std::all_of(horarioOcorreu.begin(), horarioOcorreu.end(), [](bool ocorreu) { return ocorreu; });
}

std::shared_ptr<Usuario> SistemaDeReservas::autenticarUsuario(
    const std::string& email, const std::string& senha) {
    const auto emailNormalizado = normalizarEmail(email);
    auto usuario = repoUsuarios.buscarPorEmail(emailNormalizado);
    if (!usuario || !usuario->fazerLogin(emailNormalizado, senha)) return nullptr;
    return usuario;
}

bool SistemaDeReservas::cadastrarProfessor(
    const std::string& nome, const std::string& email,
    const std::string& senha, const std::string& departamento) {
    const auto nomeNormalizado = aparar(nome);
    const auto emailNormalizado = normalizarEmail(email);
    const auto departamentoNormalizado = aparar(departamento);
    const auto separador = emailNormalizado.find('@');
    if (nomeNormalizado.empty() || departamentoNormalizado.empty() ||
        separador == std::string::npos || separador == 0 ||
        separador == emailNormalizado.size() - 1 ||
        emailNormalizado.find('@', separador + 1) != std::string::npos ||
        emailNormalizado.find('.', separador) == std::string::npos ||
        emailNormalizado.find_first_of(" \t\r\n") != std::string::npos) {
        throw std::invalid_argument("Informe nome, departamento e um e-mail valido.");
    }
    if (senha.size() < 8 || senha.size() > 1024) {
        throw std::invalid_argument("A senha deve conter entre 8 e 1024 caracteres.");
    }

    const auto senhaHash = Usuario::gerarHashSenha(senha);
    return repoUsuarios.cadastrarProfessor(
        nomeNormalizado, emailNormalizado, senhaHash, departamentoNormalizado);
}

bool SistemaDeReservas::alterarHorarioReserva(int idReserva, std::vector<Horario> novosHorarios) {
    auto reserva = repoReservas.buscar(idReserva);
    if (!reserva || !reserva->getEspaco() ||
        !horariosDisponiveis(*reserva->getEspaco(), novosHorarios,
                             reserva->getDataInicio(), reserva->getDataFim(), idReserva)) return false;

    repoReservas.atualizarHorarios(idReserva, novosHorarios);
    reserva->setHorarios(std::move(novosHorarios));
    return true;
}

bool SistemaDeReservas::aprovarReserva(int idReserva) {
    return repoReservas.atualizarStatusPendente(idReserva, StatusReserva::APROVADA);
}

bool SistemaDeReservas::rejeitarReserva(int idReserva) {
    return repoReservas.atualizarStatusPendente(idReserva, StatusReserva::REJEITADA);
}

bool SistemaDeReservas::cancelarReserva(int idReserva, int idProfessor) {
    return repoReservas.cancelarReserva(idReserva, idProfessor);
}

void SistemaDeReservas::removerEspacoDoSistema(int idEspaco) {
    repoEspacos.remover(idEspaco);
}
