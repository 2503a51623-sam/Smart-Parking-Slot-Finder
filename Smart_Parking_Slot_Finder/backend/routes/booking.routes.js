import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { myBookings, allBookings, createBooking, cancelBooking } from '../controllers/booking.controller.js';
const router = Router();
router.get('/my', protect('user'), myBookings);
router.get('/', protect('admin'), allBookings);
router.post('/', protect('user'), createBooking);
router.patch('/:id/cancel', protect('user'), cancelBooking);
export default router;
