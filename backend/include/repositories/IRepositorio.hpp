#pragma once
#include <memory>
#include <vector>

// ==========================================
// PADRAO REPOSITORY (CRUD generico)
// T e sempre manipulado via shared_ptr, pois as entidades do dominio
// (Espaco, Usuario) sao polimorficas/abstratas.
// ==========================================
template <typename T>
class IRepositorio {
public:
    // Destrutor virtual: apagar um repositorio pela interface chama o destrutor certo.
    virtual ~IRepositorio() = default;

    // Create: insere o objeto e preenche o id gerado pelo banco.
    virtual void salvar(std::shared_ptr<T> obj) = 0;
    // Read: devolve nullptr se o id nao existir.
    virtual std::shared_ptr<T> buscar(int id) = 0;
    // Update: grava o estado atual do objeto na linha de mesmo id.
    virtual void atualizar(std::shared_ptr<T> obj) = 0;
    // Delete.
    virtual void remover(int id) = 0;
    virtual std::vector<std::shared_ptr<T>> listarTodos() = 0;
};
