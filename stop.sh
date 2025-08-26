#!/bin/bash

# Script d'arrêt propre pour SUPRSS

echo "🛑 Arrêt de SUPRSS..."

# Vérifier si Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas disponible"
    exit 1
fi

# Vérifier si des conteneurs SUPRSS sont en cours
existing_containers=$(docker ps -q --filter "name=suprss")

if [ -z "$existing_containers" ]; then
    echo "ℹ️  Aucune instance SUPRSS en cours d'exécution"
    exit 0
fi

echo "🔍 Instances SUPRSS détectées:"
docker ps --filter "name=suprss" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Arrêt propre avec docker-compose
echo "⏳ Arrêt des services via Docker Compose..."
docker-compose down

# Attendre un peu
sleep 3

# Vérifier si tous les conteneurs sont arrêtés
still_running=$(docker ps -q --filter "name=suprss")
if [ ! -z "$still_running" ]; then
    echo "⚠️  Forçage de l'arrêt des conteneurs récalcitrants..."
    docker stop $still_running
    docker rm $still_running
fi

# Vérification finale
final_check=$(docker ps -q --filter "name=suprss")
if [ ! -z "$final_check" ]; then
    echo "❌ Certains conteneurs sont encore actifs:"
    docker ps --filter "name=suprss"
    exit 1
else
    echo "✅ Tous les conteneurs SUPRSS ont été arrêtés"
fi

echo "🧹 Nettoyage des réseaux orphelins..."
docker network prune -f > /dev/null 2>&1

echo "🎉 SUPRSS arrêté avec succès !"