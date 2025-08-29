@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🛑 Arrêt de SUPRSS...

REM Vérifier si Docker est disponible
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

REM Vérifier si des conteneurs SUPRSS sont en cours
for /f %%i in ('docker ps -q --filter "name=suprss" 2^>nul') do set existing_containers=%%i

if not defined existing_containers (
    echo ℹ️  Aucune instance SUPRSS en cours d'exécution
    pause
    exit /b 0
)

echo 🔍 Instances SUPRSS détectées:
docker ps --filter "name=suprss" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

REM Arrêt propre avec docker-compose
echo ⏳ Arrêt des services via Docker Compose...
docker-compose down

REM Attendre un peu
timeout /t 3 /nobreak >nul

REM Vérifier si tous les conteneurs sont arrêtés
for /f %%i in ('docker ps -q --filter "name=suprss" 2^>nul') do set still_running=%%i
if defined still_running (
    echo ⚠️  Forçage de l'arrêt des conteneurs récalcitrants...
    docker stop !still_running!
    docker rm !still_running!
)

REM Vérification finale
for /f %%i in ('docker ps -q --filter "name=suprss" 2^>nul') do set final_check=%%i
if defined final_check (
    echo ❌ Certains conteneurs sont encore actifs:
    docker ps --filter "name=suprss"
    pause
    exit /b 1
) else (
    echo ✅ Tous les conteneurs SUPRSS ont été arrêtés
)

echo 🧹 Nettoyage des réseaux orphelins...
docker network prune -f >nul 2>&1

echo 🎉 SUPRSS arrêté avec succès !
pause