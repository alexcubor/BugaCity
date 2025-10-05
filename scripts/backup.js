#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Получаем текущую дату для имени бэкапа
const now = new Date();
const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
const backupName = `bugacity-backup-${dateStr}-${timeStr}`;

console.log(`🗄️  Создание полного бэкапа: ${backupName}`);

// Создаем директорию для бэкапа
const backupDir = path.join(__dirname, '..', 'backups', backupName);
if (!fs.existsSync(path.dirname(backupDir))) {
  fs.mkdirSync(path.dirname(backupDir), { recursive: true });
  
  // Добавляем backups в .gitignore если его там нет
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('backups/')) {
      fs.appendFileSync(gitignorePath, '\n# Backup files\nbackups/\n');
      console.log('📝 Добавлена директория backups в .gitignore');
    }
  }
}
fs.mkdirSync(backupDir, { recursive: true });

console.log(`📁 Директория бэкапа: ${backupDir}`);

try {
  // 1. Бэкап MongoDB базы данных
  console.log('📊 Создание бэкапа MongoDB...');
  const mongoBackupDir = path.join(backupDir, 'mongodb');
  fs.mkdirSync(mongoBackupDir, { recursive: true });
  
  // Команда для бэкапа MongoDB с аутентификацией
  const mongoBackupCmd = `docker exec $(docker ps -q -f name=bugacity_mongodb) mongodump --host localhost:27017 --db bugacity --username bugacity_user --password bugacity_password --authenticationDatabase bugacity --out /tmp/backup`;
  const mongoCopyCmd = `docker cp $(docker ps -q -f name=bugacity_mongodb):/tmp/backup/bugacity ${mongoBackupDir}/`;
  
  execSync(mongoBackupCmd, { stdio: 'inherit' });
  execSync(mongoCopyCmd, { stdio: 'inherit' });
  
  console.log('✅ Бэкап MongoDB создан');

  // 2. Бэкап аватарок и загруженных файлов
  console.log('🖼️  Создание бэкапа аватарок и файлов...');
  const uploadsBackupDir = path.join(backupDir, 'uploads');
  
  // Копируем volume с аватарками
  const uploadsCopyCmd = `docker cp $(docker ps -q -f name=bugacity_app):/app/uploads ${uploadsBackupDir}/`;
  execSync(uploadsCopyCmd, { stdio: 'inherit' });
  
  console.log('✅ Бэкап аватарок создан');
  
  console.log('🎉 Полный бэкап успешно создан!');
  console.log(`📍 Путь к бэкапу: ${backupDir}`);

} catch (error) {
  console.error('❌ Ошибка при создании бэкапа:', error.message);
  process.exit(1);
}
