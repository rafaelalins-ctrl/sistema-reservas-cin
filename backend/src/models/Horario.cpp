#include "models/Horario.hpp"
#include <stdexcept>

Horario::Horario(DiaSemana diaSemana, int horaInicioMin, int horaFimMin)
    : diaSemana(diaSemana), horaInicioMin(horaInicioMin), horaFimMin(horaFimMin) {
    // O intervalo precisa caber em um dia e ter inicio antes do fim.
    if (horaInicioMin < 0 || horaFimMin > 1440 || horaInicioMin >= horaFimMin) {
        throw std::invalid_argument("Horario deve estar entre 0 e 1440 minutos e ter inicio anterior ao fim.");
    }
}

bool Horario::conflitaCom(const Horario& outro) const {
    if (diaSemana != outro.diaSemana) return false;
    // Dois intervalos [a,b) e [c,d) se sobrepoem se a < d e c < b.
    return horaInicioMin < outro.horaFimMin && outro.horaInicioMin < horaFimMin;
}
