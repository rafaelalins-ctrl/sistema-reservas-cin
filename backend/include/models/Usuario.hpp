#pragma once
#include <array>
#include <string>

class Espaco; // forward declaration

// ==========================================
// BLOCO DE USUARIOS (POLIMORFISMO DE AUTORIZACAO)
// ==========================================
// Dados e operacoes comuns a professores e administradores.
class Usuario {
protected:
    int id = 0;
    std::string nome;
    std::string email;
    // A senha nunca deve ser guardada em texto puro.
    std::string senhaHash;

public:
    Usuario() = default;
    Usuario(int id, std::string nome, std::string email, std::string senhaHash);
    virtual ~Usuario() = default;

    // Autentica comparando a senha informada com o hash armazenado.
    bool fazerLogin(const std::string& emailInformado, const std::string& senha) const;
    // Gera um hash com salt aleatorio para salvar no banco.
    static std::string gerarHashSenha(const std::string& senha);
    // SHA-256 de (hash armazenado + senha): confirma rapido uma senha ja verificada.
    // Muda sozinho se o hash no banco mudar.
    std::array<unsigned char, 32> resumoCredencial(const std::string& senha) const;

    // Cada tipo de usuario decide, a sua maneira, se pode reservar um espaco.
    virtual bool validarPermissaoReserva(const Espaco& e) const = 0;

    int getId() const { return id; }
    const std::string& getNome() const { return nome; }
    const std::string& getEmail() const { return email; }

    void setId(int novoId) { id = novoId; }
};
