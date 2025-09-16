#!/bin/bash

# Скрипт для создания Docker Secrets
# Использование: ./setup-secrets.sh

echo "🔐 Создание Docker Secrets..."

# Проверяем, что мы в Swarm режиме
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
    echo "❌ Docker Swarm не активен. Запускаем..."
    docker swarm init
fi

# Создаем секреты из файлов
if [ -f "secrets/jwt_secret.txt" ]; then
    docker secret create jwt_secret secrets/jwt_secret.txt
    echo "✅ jwt_secret создан"
fi

if [ -f "secrets/vk_secret.txt" ]; then
    docker secret create vk_secret secrets/vk_secret.txt
    echo "✅ vk_secret создан"
fi

if [ -f "secrets/yandex_secret.txt" ]; then
    docker secret create yandex_secret secrets/yandex_secret.txt
    echo "✅ yandex_secret создан"
fi

if [ -f "secrets/smtp_password.txt" ]; then
    docker secret create smtp_password secrets/smtp_password.txt
    echo "✅ smtp_password создан"
fi

if [ -f "secrets/mongodb_password.txt" ]; then
    docker secret create mongodb_password_new secrets/mongodb_password.txt
    echo "✅ mongodb_password_new создан"
fi

echo "🎉 Все секреты созданы!"
echo "📋 Список секретов:"
docker secret ls
