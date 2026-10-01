$ErrorActionPreference = 'Stop'

$backend = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$compiler = 'C:\mingw64\bin\g++.exe'
if (-not (Test-Path $compiler)) {
    $compiler = (Get-Command g++.exe -ErrorAction Stop).Source
}

$binary = Join-Path $env:TEMP 'sistema-reservas-model-smoke.exe'
$sources = @(
    (Join-Path $PSScriptRoot 'model_smoke.cpp'),
    (Join-Path $backend 'src/models/Enums.cpp'),
    (Join-Path $backend 'src/models/Horario.cpp'),
    (Join-Path $backend 'src/models/Espaco.cpp'),
    (Join-Path $backend 'src/models/SalaAula.cpp'),
    (Join-Path $backend 'src/models/Laboratorio.cpp'),
    (Join-Path $backend 'src/models/Auditorio.cpp'),
    (Join-Path $backend 'src/models/Reserva.cpp')
)

& $compiler -std=c++17 "-I$(Join-Path $backend 'include')" @sources -o $binary
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $binary
exit $LASTEXITCODE