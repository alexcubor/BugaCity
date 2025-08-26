import express from 'express';
import { authController } from '../controllers/authController';

const router = express.Router();

// Регистрация
router.post('/register', authController.register);

// Вход
router.post('/login', authController.login);

// OAuth callback для Яндекса
router.get('/callback', authController.handleOAuthCallback);

// VK callback
router.post('/vk-callback', authController.handleVKCallback);

// Получение данных пользователя VK
router.get('/vk-user', authController.getVKUser);

export default router;
