#include "util/Datas.hpp"
#include <ctime>
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace {
// Le "AAAA-MM-DD" exigindo que a string inteira seja consumida.
std::tm lerData(const std::string& data) {
    std::tm partes{};
    std::istringstream entrada(data);
    entrada >> std::get_time(&partes, "%Y-%m-%d");
    if (entrada.fail() || entrada.peek() != std::char_traits<char>::eof()) {
        throw std::invalid_argument("Data deve usar o formato AAAA-MM-DD.");
    }
    // Meio-dia evita que a conversao de fuso altere o dia em horarios de verao.
    partes.tm_hour = 12;
    partes.tm_isdst = -1;
    return partes;
}

std::string formatar(const std::tm& partes) {
    char texto[11];
    std::strftime(texto, sizeof(texto), "%Y-%m-%d", &partes);
    return texto;
}
}

namespace Datas {
DiaSemana diaDaData(const std::string& data) {
    auto partes = lerData(data);
    if (std::mktime(&partes) == -1) throw std::invalid_argument("Data invalida.");
    // mktime normaliza datas como 2026-02-30; se mudou, a data nao existe.
    if (formatar(partes) != data) throw std::invalid_argument("Data invalida.");
    // tm_wday comeca no domingo (0); DiaSemana comeca na segunda.
    return static_cast<DiaSemana>((partes.tm_wday + 6) % 7);
}

std::string proximaData(const std::string& data) {
    auto partes = lerData(data);
    // mktime ajusta virada de mes e de ano (ex.: 31 -> 1 do mes seguinte).
    partes.tm_mday += 1;
    if (std::mktime(&partes) == -1) throw std::invalid_argument("Data invalida.");
    return formatar(partes);
}

std::string hoje() {
    const std::time_t agora = std::time(nullptr);
    std::tm local{};
#ifdef _WIN32
    localtime_s(&local, &agora);
#else
    localtime_r(&agora, &local);
#endif
    return formatar(local);
}

std::string agoraUtc() {
    const std::time_t agora = std::time(nullptr);
    std::tm utc{};
#ifdef _WIN32
    gmtime_s(&utc, &agora);
#else
    gmtime_r(&agora, &utc);
#endif
    std::ostringstream resultado;
    resultado << std::put_time(&utc, "%Y-%m-%dT%H:%M:%SZ");
    return resultado.str();
}
}
