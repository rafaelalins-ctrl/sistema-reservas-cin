#pragma once
#include "models/Enums.hpp"

// ==========================================
// VALUE OBJECT: HORARIO
// ==========================================
// Representa um intervalo semanal; os limites sao minutos desde meia-noite.
class Horario {
private:
    DiaSemana diaSemana = DiaSemana::SEGUNDA;
    int horaInicioMin = 0; // minutos desde 00:00, ex: 8:30 = 510
    int horaFimMin = 0;

public:
    Horario() = default;
    Horario(DiaSemana diaSemana, int horaInicioMin, int horaFimMin);

    // Verifica sobreposicao de horario no mesmo dia da semana.
    bool conflitaCom(const Horario& outro) const;

    DiaSemana getDiaSemana() const { return diaSemana; }
    int getHoraInicioMin() const { return horaInicioMin; }
    int getHoraFimMin() const { return horaFimMin; }
};
