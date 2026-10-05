#include "services/SistemaDeReservas.hpp"
#include "models/Professor.hpp"
#include "util/Datas.hpp"
#include <openssl/crypto.h>
#include <algorithm>
#include <cctype>
#include <stdexcept>

namespace {
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

bool SistemaDeReservas::processarNovaReserva(
    std::shared_ptr<Reserva> r, std::vector<ConflitoReserva>* conflitos) {
    if (!r || !r->getEspaco() || !r->getSolicitante()) return false;
    if (r->getDataFim() < r->getDataInicio() || r->getHorarios().empty()) return false;

    if (!r->getSolicitante()->validarPermissaoReserva(*r->getEspaco())) {
        return false;
    }

    if (!horariosDisponiveis(*r->getEspaco(), r->getHorarios(),
                             r->getDataInicio(), r->getDataFim(), 0, conflitos)) return false;

    repoReservas.salvar(r);
    return true;
}

bool SistemaDeReservas::horariosDisponiveis(
    const Espaco& espaco, const std::vector<Horario>& horarios,
    const std::string& dataInicio, const std::string& dataFim, int idReservaIgnorada,
    std::vector<ConflitoReserva>* conflitos) {
    if (conflitos) conflitos->clear();
    if (horarios.empty() || dataFim < dataInicio) return false;
    Datas::diaDaData(dataInicio);
    Datas::diaDaData(dataFim);

    // Um pedido nao pode ter dois horarios sobrepostos no mesmo dia da semana.
    for (std::size_t i = 0; i < horarios.size(); ++i) {
        for (std::size_t j = i + 1; j < horarios.size(); ++j) {
            if (horarios[i].conflitaCom(horarios[j])) return false;
        }
    }

    // Cada linha semanal precisa acontecer ao menos uma vez dentro do periodo.
    std::vector<bool> horarioOcorreu(horarios.size(), false);
    for (std::string data = dataInicio; data <= dataFim; data = Datas::proximaData(data)) {
        const auto dia = Datas::diaDaData(data);
        for (std::size_t i = 0; i < horarios.size(); ++i) {
            if (horarios[i].getDiaSemana() == dia) {
                horarioOcorreu[i] = true;
                if (!verificarDisponibilidade(espaco, horarios[i], data, idReservaIgnorada)) {
                    if (conflitos) {
                        conflitos->push_back({data, horarios[i].getHoraInicioMin(),
                                              horarios[i].getHoraFimMin()});
                    } else {
                        return false;
                    }
                }
            }
        }
    }
    const bool todosOcorreram = std::all_of(
        horarioOcorreu.begin(), horarioOcorreu.end(), [](bool ocorreu) { return ocorreu; });
    return todosOcorreram && (!conflitos || conflitos->empty());
}

std::shared_ptr<Usuario> SistemaDeReservas::autenticarUsuario(
    const std::string& email, const std::string& senha) {
    const auto emailNormalizado = normalizarEmail(email);
    std::shared_ptr<Usuario> usuario;
    {
        const auto trava = travarBanco();
        usuario = repoUsuarios.buscarPorEmail(emailNormalizado);
    }
    if (!usuario || senha.empty() || senha.size() > 1024) return nullptr;

    // O HTTP Basic reenvia a senha a cada requisicao. O PBKDF2 roda fora da trava do banco
    // e so na primeira vez: depois, um resumo rapido confirma a mesma senha por alguns minutos.
    const auto resumo = usuario->resumoCredencial(senha);
    const auto agora = std::chrono::steady_clock::now();
    {
        std::lock_guard<std::mutex> trava(mutexCredenciais);
        const auto encontrada = credenciaisVerificadas.find(emailNormalizado);
        if (encontrada != credenciaisVerificadas.end() && encontrada->second.expiraEm > agora &&
            CRYPTO_memcmp(encontrada->second.resumo.data(), resumo.data(), resumo.size()) == 0) {
            return usuario;
        }
    }

    if (!usuario->fazerLogin(emailNormalizado, senha)) return nullptr;
    std::lock_guard<std::mutex> trava(mutexCredenciais);
    credenciaisVerificadas[emailNormalizado] = {resumo, agora + validadeCredencial};
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
    const auto trava = travarBanco();
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

bool SistemaDeReservas::rejeitarReserva(int idReserva, const std::string& motivo) {
    return repoReservas.atualizarStatusPendente(
        idReserva, StatusReserva::REJEITADA, aparar(motivo));
}

bool SistemaDeReservas::cancelarReserva(int idReserva, int idProfessor, const std::string& motivo) {
    return repoReservas.cancelarReserva(idReserva, idProfessor, Datas::hoje(), aparar(motivo));
}

void SistemaDeReservas::removerEspacoDoSistema(int idEspaco) {
    repoEspacos.remover(idEspaco);
}
