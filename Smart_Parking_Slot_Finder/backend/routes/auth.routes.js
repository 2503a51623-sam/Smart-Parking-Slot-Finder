import { Router } from 'express';
import { register, userLogin, adminLogin } from '../controllers/auth.controller.js';
const router = Router();
router.post('/register', register);
router.post('/user/login', userLogin);
router.post('/admin/login', adminLogin);
export default router;
