import express from 'express';
import { authController } from '../controllers/authController';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/vk-callback', authController.handleVKCallback); // For VK ID SDK
router.get('/vk-user', authController.getVKUser); // Get VK user data
router.get('/callback', authController.handleOAuthCallback); // For Yandex OAuth

export default router;
