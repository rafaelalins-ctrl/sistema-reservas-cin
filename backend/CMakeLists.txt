cmake_minimum_required(VERSION 3.16)
project(sistema_reservas_cin CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------
# Dependencias
# ---------------------------------------------
find_package(SQLite3 REQUIRED)
find_package(Threads REQUIRED)

include(FetchContent)
FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG v1.2.0
)
# Crow e header-only a partir da v1.0; nao precisamos compilar exemplos/testes dele.
set(CROW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(CROW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(Crow)

# ---------------------------------------------
# Fontes
# ---------------------------------------------
file(GLOB_RECURSE SOURCES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
)

add_executable(sistema_reservas ${SOURCES})

target_include_directories(sistema_reservas PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
)

target_link_libraries(sistema_reservas PRIVATE
    Crow::Crow
    SQLite::SQLite3
    Threads::Threads
)

# Copia database/ (schema.sql) para perto do binario para facilitar o `run`.
file(COPY "${CMAKE_CURRENT_SOURCE_DIR}/database" DESTINATION "${CMAKE_CURRENT_BINARY_DIR}")
