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
    virtual ~IRepositorio() = default;

    virtual void salvar(std::shared_ptr<T> obj) = 0;
    virtual std::shared_ptr<T> buscar(int id) = 0;
    virtual void atualizar(std::shared_ptr<T> obj) = 0;
    virtual void remover(int id) = 0;
    virtual std::vector<std::shared_ptr<T>> listarTodos() = 0;
};
