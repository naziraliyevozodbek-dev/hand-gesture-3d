@echo off
title Hand Gesture 3D - Spatial HUD
cd /d "%~dp0"

echo =======================================================
echo          HAND GESTURE 3D - SPATIAL HUD
echo    Computer Vision (MediaPipe) & 3D (Three.js)
echo =======================================================
echo.
echo [1/2] Mahalliy veb-server ishga tushirilmoqda...
echo Port: 3000
echo Papka: %~dp0
echo.

:: 1 soniyadan so'ng brauzerni avtomatik ochish
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Python mavjudligini tekshirish
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [2/2] Python http.server ishga tushirildi!
    echo.
    echo Brauzerda ochilmoqda: http://localhost:3000
    echo Serverni to'xtatish uchun: Ctrl + C bosing.
    echo.
    python -m http.server 3000
    goto :end
)

:: Agar Python bo'lmasa, Node.js orqali ishga tushirish
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [2/2] Node.js orqali mini-server ishga tushirildi!
    echo.
    echo Brauzerda ochilmoqda: http://localhost:3000
    echo Serverni to'xtatish uchun: Ctrl + C bosing.
    echo.
    node -e "const http = require('http'); const fs = require('fs'); const path = require('path'); const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png'}; http.createServer((req, res) => { let f = '.' + (req.url === '/' ? '/index.html' : req.url); fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end('Not Found'); return; } res.writeHead(200, {'Content-Type': mime[path.extname(f)] || 'text/plain'}); res.end(data); }); }).listen(3000);"
    goto :end
)

:: Agar Python ham, Node ham bo'lmasa PowerShell orqali ishga tushirish
echo [2/2] PowerShell orqali server ishga tushirilmoqda...
powershell -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:3000/'); $listener.Start(); Write-Host 'Server running at http://localhost:3000/'; while ($listener.IsListening) { $context = $listener.GetContext(); $req = $context.Request; $res = $context.Response; $file = Join-Path (Get-Location) ($req.Url.LocalPath.TrimStart('/')); if (-not (Test-Path $file) -or (Get-Item $file).PSIsContainer) { $file = Join-Path (Get-Location) 'index.html'; } if (Test-Path $file) { $bytes = [System.IO.File]::ReadAllBytes($file); $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length); } else { $res.StatusCode = 404; } $res.Close(); }"

:end
pause
