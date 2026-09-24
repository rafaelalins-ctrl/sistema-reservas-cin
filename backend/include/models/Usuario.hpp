#pragma once
#include <string>

class Espaco; // forward declaration

// ==========================================
// BLOCO DE USUARIOS (POLIMORFISMO DE AUTORIZACAO)
// ==========================================
class Usuario {
protected:
    int id = 0;
    std::string nome;
    std::string email;
    std::string senhaHash;

public:
    Usuario() = default;
    Usuario(int id, std::string nome, std::string email, std::string senhaHash);
    virtual ~Usuario() = default;

    bool fazerLogin(const std::string& emailInformado, const std::string& senha) const;

    // Cada tipo de usuario decide, a sua maneira, se pode reservar um espaco.
    virtual bool validarPermissaoReserva(const Espaco& e) const = 0;

    int getId() const { return id; }
    const std::string& getNome() const { return nome; }
    const std::string& getEmail() const { return email; }
    const std::string& getSenhaHash() const { return senhaHash; }

    void setId(int novoId) { id = novoId; }
};
