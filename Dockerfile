# Используем официальный Node.js образ
FROM node:18-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (включая dev для сборки)
RUN npm ci

# Устанавливаем webpack-cli глобально
RUN npm install -g webpack-cli

# Копируем исходный код
COPY . .

# Собираем проект
RUN npm run build

# Продакшен образ
FROM node:18-alpine AS production

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем только продакшен зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение из builder стадии
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/client/public ./client/public

# Открываем порт
EXPOSE 80

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=80

# Запускаем под root для доступа к порту 80
# USER nextjs

# Команда запуска
CMD ["node", "dist/server/index.js"]
