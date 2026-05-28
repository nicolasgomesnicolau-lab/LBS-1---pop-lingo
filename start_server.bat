@echo off
title LBS #1 Server
echo ========================================
echo  LBS #1 - Servidor Local (Node.js)
echo ========================================
echo.
echo  Fechando servidor anterior na porta 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":8000 "') do (
  taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo.
echo  Abrindo http://localhost:8000 no navegador...
echo.
echo  Pressione CTRL+C para parar o servidor.
echo ========================================
echo.
node server.js
pause
