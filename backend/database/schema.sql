-- ==========================================
-- SCHEMA - Sistema de Reservas CIn
-- ==========================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    senha_hash      TEXT NOT NULL,
    tipo            TEXT NOT NULL CHECK (tipo IN ('ADMINISTRADOR', 'PROFESSOR')),
    departamento    TEXT -- usado apenas quando tipo = 'PROFESSOR'
);

CREATE TABLE IF NOT EXISTS espacos (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo                  TEXT NOT NULL UNIQUE,
    identificacao           TEXT NOT NULL,
    capacidade              INTEGER NOT NULL,
    bloco                   TEXT NOT NULL,
    andar                   TEXT NOT NULL DEFAULT 'Térreo',
    detalhes                TEXT,
    mobilia                 TEXT NOT NULL,
    qtd_tomadas             INTEGER NOT NULL DEFAULT 0,
    acessivel_cadeirante    INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
    requer_retirada_chave   INTEGER NOT NULL DEFAULT 0,
    em_manutencao           INTEGER NOT NULL DEFAULT 0,
    tipo                    TEXT NOT NULL CHECK (tipo IN ('SALA_AULA', 'LABORATORIO', 'AUDITORIO', 'SALA_REUNIAO')),

    -- Campos especificos de SalaAula
    tipo_quadro             TEXT,
    possui_projetor         INTEGER,

    -- Campos especificos de Laboratorio
    qtd_computadores        INTEGER,
    softwares_instalados    TEXT, -- lista separada por virgula, ou JSON

    -- Campos especificos de Auditorio
    equipamento_som         INTEGER,
    cabine_traducao         INTEGER
);

CREATE TABLE IF NOT EXISTS reservas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    data_inicio     TEXT NOT NULL,
    data_fim        TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA')),
    id_professor    INTEGER NOT NULL REFERENCES usuarios(id),
    id_espaco       INTEGER NOT NULL REFERENCES espacos(id)
);

CREATE TABLE IF NOT EXISTS reserva_horarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_reserva      INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    dia_semana      TEXT NOT NULL,
    hora_inicio_min INTEGER NOT NULL,
    hora_fim_min    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservas_espaco ON reservas(id_espaco);
CREATE INDEX IF NOT EXISTS idx_reserva_horarios_reserva ON reserva_horarios(id_reserva);
