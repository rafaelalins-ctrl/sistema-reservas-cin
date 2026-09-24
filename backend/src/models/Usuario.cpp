#include "models/Usuario.hpp"

Usuario::Usuario(int id, std::string nome, std::string email, std::string senhaHash)
    : id(id), nome(std::move(nome)), email(std::move(email)), senhaHash(std::move(senhaHash)) {}

bool Usuario::fazerLogin(const std::string& emailInformado, const std::string& senha) const {
    // TODO: comparar 'senha' com 'senhaHash' usando uma funcao de hash segura.
    return emailInformado == email;
}
