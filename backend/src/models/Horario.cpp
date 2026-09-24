#include "models/Horario.hpp"

Horario::Horario(DiaSemana diaSemana, int horaInicioMin, int horaFimMin)
    : diaSemana(diaSemana), horaInicioMin(horaInicioMin), horaFimMin(horaFimMin) {}

bool Horario::conflitaCom(const Horario& outro) const {
    if (diaSemana != outro.diaSemana) return false;
    // Dois intervalos [a,b) e [c,d) se sobrepoem se a < d e c < b.
    return horaInicioMin < outro.horaFimMin && outro.horaInicioMin < horaFimMin;
}
