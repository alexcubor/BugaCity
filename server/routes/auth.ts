import express from 'express';
import { authController } from '../controllers/authController';

const router = express.Router();

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

export default router;
