@echo off
title Subir cambios a GitHub
color 0A
echo.
echo  ============================================
echo   Actualizando y subiendo web a GitHub...
echo  ============================================
echo.

cd /d "%~dp0"

:: 1. Copiar index.html desde la carpeta WEB (fuente) a la raiz del repo
echo  Copiando index.html...
copy /Y "C:\Users\pc gamer\Desktop\UMI\WEB\index.html" "%~dp0index.html" >nul
if %ERRORLEVEL% NEQ 0 (
  echo  ERROR: No se pudo copiar index.html
  pause
  exit /b 1
)
echo  Copia OK.

:: 2. Agregar y commitear si hay cambios
git add index.html
git diff --cached --quiet
if %ERRORLEVEL% NEQ 0 (
  echo  Guardando cambios...
  git commit -m "update: actualizar web"
) else (
  echo  Sin cambios nuevos en index.html.
)

:: 3. Subir a GitHub
echo  Subiendo a GitHub...
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo  ============================================
  echo   LISTO! Web actualizada en uminikkeibar.cl
  echo   Los cambios se ven en 1-2 minutos.
  echo  ============================================
) else (
  echo  ERROR al subir. Intenta de nuevo.
)
echo.
pause
