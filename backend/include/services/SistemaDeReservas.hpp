#pragma once
#include <memory>
#include <vector>
#include "repositories/RepositorioEspaco.hpp"
#include "repositories/RepositorioReserva.hpp"
#include "models/Horario.hpp"
#include "models/Reserva.hpp"

// ==========================================
// CLASSE ORQUESTRADORA (conecta as rotas do Crow ao dominio/persistencia)
// ==========================================
class SistemaDeReservas {
private:
    RepositorioEspaco repoEspacos;
    RepositorioReserva repoReservas;

public:
    SistemaDeReservas(sqlite3* db)
        : repoEspacos(db), repoReservas(db, &repoEspacos) {}

    // Verifica se um Espaco esta livre num dado Horario/data (sem conflitos
    // com reservas ja APROVADAS/PENDENTES).
    bool verificarDisponibilidade(const Espaco& e, const Horario& h, const std::string& data);

    // Lista espacos que atendem capacidade minima e estao livres no horario informado.
    std::vector<std::shared_ptr<Espaco>> listarEspacosDisponiveis(
        const Horario& h, const std::string& data, int capMinima);

    // Valida permissao do solicitante, checa disponibilidade e persiste a reserva
    // (status inicial PENDENTE).
    bool processarNovaReserva(std::shared_ptr<Reserva> r);

    // Substitui os horarios de uma reserva existente, revalidando conflitos.
    bool alterarHorarioReserva(int idReserva, std::vector<Horario> novosHorarios);

    void removerEspacoDoSistema(int idEspaco);

    RepositorioEspaco& getRepositorioEspacos() { return repoEspacos; }
    RepositorioReserva& getRepositorioReservas() { return repoReservas; }
};
