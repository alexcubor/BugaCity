import fs from 'fs';
import path from 'path';

/**
 * Универсальная функция для удаления пользователя и его данных
 * @param db - подключение к базе данных
 * @param email - email пользователя для удаления
 * @returns объект с результатом удаления
 */
export async function deleteUserAndData(db: any, email: string) {
  try {
    // Сначала находим пользователя, чтобы получить его ID
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return { 
        success: false, 
        message: 'Пользователь не найден', 
        deletedCount: 0 
      };
    }

    // Удаляем пользователя из базы данных
    const result = await db.collection('users').deleteOne({ email });
    
    if (result.deletedCount > 0) {
      // Удаляем папку пользователя и все его файлы
      try {
        const userId = user._id.toString();
        const relativePath = `users/${userId.substring(0, 8).padStart(8, '0')}/${userId}`;
        const fullPath = path.join(process.cwd(), 'uploads', relativePath);
        
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`✅ Папка пользователя удалена: ${fullPath}`);
        }
      } catch (dirError) {
        console.error('⚠️ Ошибка при удалении папки пользователя:', dirError);
        // Не прерываем выполнение, если не удалось удалить папку
      }
      
      return { 
        success: true, 
        message: 'Пользователь и его данные удалены', 
        deletedCount: result.deletedCount 
      };
    } else {
      return { 
        success: false, 
        message: 'Пользователь не найден', 
        deletedCount: 0 
      };
    }
  } catch (error) {
    console.error('❌ Ошибка при удалении пользователя:', error);
    return { 
      success: false, 
      message: 'Ошибка при удалении пользователя', 
      deletedCount: 0,
      error: error 
    };
  }
}
