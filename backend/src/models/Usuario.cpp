#include "models/Usuario.hpp"
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <algorithm>
#include <array>
#include <charconv>
#include <stdexcept>
#include <string_view>
#include <vector>

namespace {
// Parametros usados para gerar e conferir hashes de senha.
constexpr int iteracoesPbkdf2 = 600000;
constexpr std::size_t tamanhoSalt = 16;
constexpr std::size_t tamanhoHash = 32;

// Salt e hash sao bytes; no banco ficam em Base64 dentro do texto do hash.
std::string codificarBase64(const unsigned char* dados, std::size_t tamanho) {
    std::string resultado(4 * ((tamanho + 2) / 3), '\0');
    const int tamanhoCodificado = EVP_EncodeBlock(
        reinterpret_cast<unsigned char*>(resultado.data()), dados, static_cast<int>(tamanho));
    resultado.resize(static_cast<std::size_t>(tamanhoCodificado));
    return resultado;
}

bool decodificarBase64(std::string_view texto, unsigned char* saida, std::size_t tamanhoEsperado) {
    if (texto.size() != 4 * ((tamanhoEsperado + 2) / 3)) return false;
    std::vector<unsigned char> temporario(3 * (texto.size() / 4));
    const int decodificado = EVP_DecodeBlock(temporario.data(),
        reinterpret_cast<const unsigned char*>(texto.data()), static_cast<int>(texto.size()));
    if (decodificado < 0) return false;
    // EVP_DecodeBlock conta tambem os bytes representados pelo padding '='.
    std::size_t tamanhoReal = static_cast<std::size_t>(decodificado);
    if (!texto.empty() && texto.back() == '=') --tamanhoReal;
    if (texto.size() > 1 && texto[texto.size() - 2] == '=') --tamanhoReal;
    if (tamanhoReal != tamanhoEsperado) return false;
    std::copy_n(temporario.data(), tamanhoEsperado, saida);
    return true;
}

bool verificarHashSenha(const std::string& senha, const std::string& hashArmazenado) {
    // Formato: algoritmo$iteracoes$salt$hash.
    constexpr std::string_view prefixo = "pbkdf2_sha256$";
    if (hashArmazenado.compare(0, prefixo.size(), prefixo) != 0) return false;

    const auto separadorIteracoes = hashArmazenado.find('$', prefixo.size());
    if (separadorIteracoes == std::string::npos) return false;
    const auto separadorSalt = hashArmazenado.find('$', separadorIteracoes + 1);
    if (separadorSalt == std::string::npos) return false;

    int iteracoes = 0;
    const auto textoIteracoes = std::string_view(hashArmazenado).substr(
        prefixo.size(), separadorIteracoes - prefixo.size());
    const auto conversao = std::from_chars(
        textoIteracoes.data(), textoIteracoes.data() + textoIteracoes.size(), iteracoes);
    if (conversao.ec != std::errc{} || conversao.ptr != textoIteracoes.data() + textoIteracoes.size() ||
        iteracoes < 10000 || iteracoes > 2000000) {
        return false;
    }

    const auto textoSalt = std::string_view(hashArmazenado).substr(
        separadorIteracoes + 1, separadorSalt - separadorIteracoes - 1);
    const auto textoHash = std::string_view(hashArmazenado).substr(separadorSalt + 1);
    std::array<unsigned char, tamanhoSalt> salt{};
    std::array<unsigned char, tamanhoHash> hashEsperado{};
    std::array<unsigned char, tamanhoHash> hashCalculado{};
    if (!decodificarBase64(textoSalt, salt.data(), salt.size()) ||
        !decodificarBase64(textoHash, hashEsperado.data(), hashEsperado.size())) {
        return false;
    }

    if (PKCS5_PBKDF2_HMAC(senha.data(), static_cast<int>(senha.size()), salt.data(),
                          static_cast<int>(salt.size()), iteracoes, EVP_sha256(),
                          static_cast<int>(hashCalculado.size()), hashCalculado.data()) != 1) {
        return false;
    }
    // Comparacao em tempo constante para nao revelar o ponto da diferenca.
    return CRYPTO_memcmp(hashEsperado.data(), hashCalculado.data(), hashCalculado.size()) == 0;
}
}

Usuario::Usuario(int id, std::string nome, std::string email, std::string senhaHash)
    : id(id), nome(std::move(nome)), email(std::move(email)), senhaHash(std::move(senhaHash)) {}

// O email ja chega normalizado; a senha e conferida recalculando o PBKDF2.
bool Usuario::fazerLogin(const std::string& emailInformado, const std::string& senha) const {
    return emailInformado == email && !senha.empty() && senha.size() <= 1024 &&
        verificarHashSenha(senha, senhaHash);
}

std::array<unsigned char, 32> Usuario::resumoCredencial(const std::string& senha) const {
    std::array<unsigned char, 32> resumo{};
    std::string entrada = senhaHash;
    // Separador entre hash e senha, para que pares diferentes nunca gerem o mesmo texto.
    entrada.push_back('\0');
    entrada += senha;
    unsigned int tamanho = 0;
    if (EVP_Digest(entrada.data(), entrada.size(), resumo.data(), &tamanho, EVP_sha256(), nullptr) != 1 ||
        tamanho != resumo.size()) {
        throw std::runtime_error("Falha ao calcular resumo da credencial com OpenSSL.");
    }
    return resumo;
}

std::string Usuario::gerarHashSenha(const std::string& senha) {
    if (senha.empty() || senha.size() > 1024) {
        throw std::invalid_argument("Senha deve conter entre 1 e 1024 bytes.");
    }
    // Salt aleatorio por senha: duas contas com a mesma senha tem hashes diferentes.
    std::array<unsigned char, tamanhoSalt> salt{};
    std::array<unsigned char, tamanhoHash> hash{};
    if (RAND_bytes(salt.data(), static_cast<int>(salt.size())) != 1 ||
        PKCS5_PBKDF2_HMAC(senha.data(), static_cast<int>(senha.size()), salt.data(),
                          static_cast<int>(salt.size()), iteracoesPbkdf2, EVP_sha256(),
                          static_cast<int>(hash.size()), hash.data()) != 1) {
        throw std::runtime_error("Falha ao gerar hash de senha com OpenSSL.");
    }
    return "pbkdf2_sha256$" + std::to_string(iteracoesPbkdf2) + "$" +
        codificarBase64(salt.data(), salt.size()) + "$" + codificarBase64(hash.data(), hash.size());
}
