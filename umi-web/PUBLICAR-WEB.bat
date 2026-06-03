@echo off
title Publicar Web Umi en Internet
echo.
echo  ============================================
echo   Publicando restaurante Umi en internet...
echo  ============================================
echo.
echo  Se abrira surge.sh para publicar el sitio.
echo  Si es la primera vez, te pedira:
echo    - Tu email (puede ser cualquiera, ej: admin@umi.cl)
echo    - Una contrasena nueva
echo.
echo  El sitio quedara en: https://umi-coquimbo.surge.sh
echo.
pause

"C:\Users\pc gamer\AppData\Roaming\npm\surge.cmd" "C:\Users\pc gamer\Desktop\umi-web" umi-coquimbo.surge.sh

echo.
echo  ============================================
echo   Listo! Sitio publicado en:
echo   https://umi-coquimbo.surge.sh
echo  ============================================
echo.
pause
