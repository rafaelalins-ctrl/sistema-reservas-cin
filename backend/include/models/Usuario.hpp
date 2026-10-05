#pragma once
#include <array>
#include <string>
#include <utility>

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
    // Valor da coluna usuarios.tipo correspondente ao tipo concreto.
    virtual std::string tipo() const = 0;

    int getId() const { return id; }
    const std::string& getNome() const { return nome; }
    const std::string& getEmail() const { return email; }
    // Usado so pela persistencia; nunca deve sair na API.
    const std::string& getSenhaHash() const { return senhaHash; }

    void setId(int novoId) { id = novoId; }
    void setNome(std::string novoNome) { nome = std::move(novoNome); }
    // Recebe um hash pronto (ver gerarHashSenha), nunca a senha em texto puro.
    void setSenhaHash(std::string novoHash) { senhaHash = std::move(novoHash); }
};
