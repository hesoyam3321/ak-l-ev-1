@echo off
chcp 65001 >nul
title GitHub Yukleme Yardimcisi
color 0b

echo ======================================================================
echo                 GITHUB'A YUKLEME YARDIMCISI
echo ======================================================================
echo.
echo Bu script projenizi yerel git deposu olarak hazirlar.
echo.
echo Adim 1: GitHub.com'da yeni bir Public/Private depo (repository) olusturun.
echo Adim 2: Deponuzun linkini kopyalayin (Orn: https://github.com/kullanici/pc-wake.git)
echo.
echo ======================================================================
echo.

if not exist .git (
    echo [+] Git deposu baslatiliyor...
    git init
    git branch -M main
)

git add .
git commit -m "Remote PC Wake-on-LAN Controller Kurulumu"

echo.
echo [+] Dosyalar git'e kaydedildi.
echo.
set /p REPO_URL="GitHub Repo Linkinizi yapistirin ve Enter'a basin: "

if "%REPO_URL%"=="" (
    echo.
    echo Link girilmedi. Daha sonra su komutla yukleyebilirsiniz:
    echo   git remote add origin LINKINIZ
    echo   git push -u origin main
    pause
    exit /b
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
echo.
echo [+] GitHub'a yukleniyor (push)...
git push -u origin main

echo.
echo ======================================================================
echo TEBRIKLER! Yukleme tamamlandi.
echo Simdi GitHub repo sayfanizdan:
echo Settings -> Pages -> Branch: main / (root) secip Save'e basin.
echo ======================================================================
pause
