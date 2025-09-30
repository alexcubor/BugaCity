import express from 'express';
import fs from 'fs';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Проверка существования email
router.post('/check-email', authController.checkEmailExists);

// Отправка кода подтверждения
router.post('/send-verification', authController.sendVerificationCode);

// Registration
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// OAuth callback
router.get('/callback', authController.handleOAuthCallback);

// VK callback
router.post('/vk-callback', authController.handleVKCallback);

// VK user info
router.get('/vk-user', authController.getVKUser);

// Delete user (требует авторизации)
router.post('/delete-user', authenticateToken, authController.deleteUser);

export default router;
