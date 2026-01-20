@echo off
echo.
echo ========================================
echo  Dashboard Salarial Interactivo 2025
echo  Sector Turistico-Hostelero Espana
echo ========================================
echo.
echo Iniciando servidor web local...
echo.

REM Intentar con Node.js primero
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Usando Node.js para iniciar servidor...
    echo.
    echo IMPORTANTE: Manten esta ventana abierta
    echo El dashboard se abrira automaticamente
    echo Si no se abre, visita: http://localhost:8000
    echo Para detener: Presiona Ctrl+C
    echo.
    echo ========================================
    echo.
    start http://localhost:8000
    node server-simple.js
    goto :end
)

REM Intentar con Python si Node no está
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Usando Python para iniciar servidor...
    echo.
    echo IMPORTANTE: Manten esta ventana abierta
    echo El dashboard se abrira automaticamente
    echo Si no se abre, visita: http://localhost:8000
    echo Para detener: Presiona Ctrl+C
    echo.
    echo ========================================
    echo.
    start http://localhost:8000
    python -m http.server 8000
    goto :end
)

REM Si ninguno está disponible
echo.
echo ERROR: Ni Node.js ni Python estan instalados
echo.
echo OPCIONES:
echo.
echo 1. Instalar Node.js (recomendado):
echo    https://nodejs.org/
echo.
echo 2. Instalar Python:
echo    https://www.python.org/downloads/
echo.
echo 3. Usar VSCode Live Server:
echo    - Abre VSCode
echo    - Instala extension "Live Server"
echo    - Click derecho en index.html ^> Open with Live Server
echo.
echo 4. Ejecutar manualmente si tienes Node:
echo    node server-simple.js
echo.
pause

:end
