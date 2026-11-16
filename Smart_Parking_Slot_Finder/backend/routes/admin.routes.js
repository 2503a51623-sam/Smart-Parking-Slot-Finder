import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { stats } from '../controllers/admin.controller.js';
const router = Router();
router.get('/stats', protect('admin'), stats);
export default router;
