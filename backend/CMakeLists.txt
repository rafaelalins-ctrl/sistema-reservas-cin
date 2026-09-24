cmake_minimum_required(VERSION 3.16)
project(sistema_reservas_cin C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

# ---------------------------------------------
# Dependencias
# ---------------------------------------------
find_package(SQLite3 QUIET)
if(SQLite3_FOUND)
    set(SQLITE_TARGET SQLite::SQLite3)
else()
    # Permite compilar em maquinas Windows sem SQLite instalado.
    FetchContent_Declare(
        sqlite3
        URL https://www.sqlite.org/2024/sqlite-amalgamation-3450300.zip
    )
    FetchContent_GetProperties(sqlite3)
    if(NOT sqlite3_POPULATED)
        FetchContent_Populate(sqlite3)
    endif()
    add_library(sqlite3 STATIC "${sqlite3_SOURCE_DIR}/sqlite3.c")
    target_include_directories(sqlite3 PUBLIC "${sqlite3_SOURCE_DIR}")
    set(SQLITE_TARGET sqlite3)
endif()

find_package(Threads REQUIRED)

# Crow usa standalone Asio para networking. Baixa apenas quando o header
# nao estiver disponivel no ambiente.
find_path(ASIO_INCLUDE_DIR asio.hpp)
if(NOT ASIO_INCLUDE_DIR)
    set(ASIO_ARCHIVE "${CMAKE_BINARY_DIR}/asio-1-30-2.zip")
    set(ASIO_EXTRACT_DIR "${CMAKE_BINARY_DIR}/asio-source")
    set(ASIO_DOWNLOAD_OPTIONS)
    if(DEFINED CMAKE_TLS_VERIFY)
        list(APPEND ASIO_DOWNLOAD_OPTIONS TLS_VERIFY ${CMAKE_TLS_VERIFY})
    endif()
    file(DOWNLOAD
        https://github.com/chriskohlhoff/asio/archive/refs/tags/asio-1-30-2.zip
        "${ASIO_ARCHIVE}"
        ${ASIO_DOWNLOAD_OPTIONS}
        SHOW_PROGRESS
    )
    file(MAKE_DIRECTORY "${ASIO_EXTRACT_DIR}")
    execute_process(
        COMMAND "${CMAKE_COMMAND}" -E tar xf "${ASIO_ARCHIVE}"
        WORKING_DIRECTORY "${ASIO_EXTRACT_DIR}"
        RESULT_VARIABLE ASIO_EXTRACT_RESULT
    )
    if(NOT ASIO_EXTRACT_RESULT EQUAL 0)
        message(FATAL_ERROR "Nao foi possivel extrair o Asio baixado.")
    endif()
    file(GLOB ASIO_INCLUDE_CANDIDATES
        "${ASIO_EXTRACT_DIR}/asio-asio-1-30-2/asio/include"
    )
    list(LENGTH ASIO_INCLUDE_CANDIDATES ASIO_INCLUDE_COUNT)
    if(ASIO_INCLUDE_COUNT EQUAL 0)
        message(FATAL_ERROR "O header asio.hpp nao foi encontrado no Asio baixado.")
    endif()
    list(GET ASIO_INCLUDE_CANDIDATES 0 ASIO_INCLUDE_DIR)
    set(ASIO_INCLUDE_DIR "${ASIO_INCLUDE_DIR}" CACHE PATH "Asio include directory" FORCE)
endif()

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
    ${SQLITE_TARGET}
    Threads::Threads
)

if(WIN32)
    target_link_libraries(sistema_reservas PRIVATE ws2_32 mswsock)
endif()

# Copia database/ (schema.sql) para perto do binario para facilitar o `run`.
file(COPY "${CMAKE_CURRENT_SOURCE_DIR}/database" DESTINATION "${CMAKE_CURRENT_BINARY_DIR}")
