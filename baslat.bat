@echo off
chcp 65001 >nul
title Uzaktan PC Kontrol Sunucusu (Wake-on-LAN)
color 0b

echo ======================================================================
echo           UZAKTAN BILGISAYAR ACMA WEB PANELI (WAKE-ON-LAN)
echo ======================================================================
echo.
echo  [+] Web Paneli Baslatiliyor...
echo.
echo  Bilgisayardan erisim: http://localhost:5000
echo  Telefondan erisim:    http://192.168.1.114:5000
echo.
echo  Giris Bilgileri:
echo    * Kullanici Adi : admin  (Otomatik yazilir)
echo    * Sifre         : 3321
echo.
echo ======================================================================
echo.

python server.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Hata: Python calistirilamadi! Lutfen Python yuklu oldugundan emin olun.
    pause
)
