#include <cassert>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <vector>

#include "models/Auditorio.hpp"
#include "models/Laboratorio.hpp"
#include "models/Reserva.hpp"
#include "models/SalaAula.hpp"

// Teste rapido das classes de dominio, sem banco nem HTTP (ver run_model_smoke.ps1).
// Usa assert: qualquer falha encerra o programa com erro.
int main() {
    const Horario manha(DiaSemana::SEGUNDA, 480, 540);
    const Horario sobreposto(DiaSemana::SEGUNDA, 530, 600);
    const Horario adjacente(DiaSemana::SEGUNDA, 540, 600);
    const Horario outroDia(DiaSemana::TERCA, 530, 600);

    assert(manha.conflitaCom(sobreposto));
    assert(!manha.conflitaCom(adjacente));
    assert(!manha.conflitaCom(outroDia));

    bool rejeitouHorarioInvalido = false;
    try {
        Horario invalido(DiaSemana::SEGUNDA, 600, 540);
    } catch (const std::invalid_argument&) {
        rejeitouHorarioInvalido = true;
    }
    assert(rejeitouHorarioInvalido);

    auto sala = std::make_shared<SalaAula>(
        1, "A-101", 40, BlocoCIn::BLOCO_A, TipoMobilia::CADEIRAS_MOVEIS,
        8, true, false, false, TipoQuadro::BRANCO, true);
    Laboratorio laboratorio(
        2, "Lab 02", 30, BlocoCIn::BLOCO_B, TipoMobilia::BANCADA_LAB,
        12, true, false, false, 25, {"C++", "Python"});
    Auditorio auditorio(
        3, "Auditório", 120, BlocoCIn::BLOCO_C, TipoMobilia::FIXA_ANFITEATRO,
        16, true, true, false, true, false);

    assert(sala->tipo() == "SALA_AULA");
    assert(sala->getTipoQuadro() == TipoQuadro::BRANCO);
    assert(sala->isPossuiProjetor());
    assert(laboratorio.tipo() == "LABORATORIO");
    assert(laboratorio.getQtdComputadores() == 25);
    assert(laboratorio.getSoftwaresInstalados().size() == 2);
    assert(auditorio.tipo() == "AUDITORIO");
    assert(auditorio.isEquipamentoSom());
    assert(!auditorio.isCabineTraducao());

    Reserva reserva(1, "2026-10-05", "2026-10-05", {}, sala, {manha});
    assert(reserva.getStatus() == StatusReserva::PENDENTE);
    assert(reserva.getEspaco()->getIdentificacao() == "A-101");
    reserva.aprovar();
    assert(reserva.getStatus() == StatusReserva::APROVADA);
    reserva.rejeitar();
    assert(reserva.getStatus() == StatusReserva::REJEITADA);
    reserva.cancelar();
    assert(reserva.getStatus() == StatusReserva::CANCELADA);

    std::cout << "Model smoke tests passed.\n";
    return 0;
}