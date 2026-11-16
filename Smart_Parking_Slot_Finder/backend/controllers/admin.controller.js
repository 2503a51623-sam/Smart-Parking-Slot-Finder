import ParkingLocation from '../models/ParkingLocation.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

export async function stats(_req, res, next) {
  try {
    const [locations, users, bookings, slotTotals] = await Promise.all([

      ParkingLocation.countDocuments(),

      User.countDocuments(),

      Booking.countDocuments({ status: 'booked' }),

      ParkingLocation.aggregate([
        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $add: [
                  { $ifNull: ['$vehicleSlots.bike.total', 0] },
                  { $ifNull: ['$vehicleSlots.car.total', 0] },
                  { $ifNull: ['$vehicleSlots.auto.total', 0] }
                ]
              }
            },

            available: {
              $sum: {
                $add: [
                  { $ifNull: ['$vehicleSlots.bike.available', 0] },
                  { $ifNull: ['$vehicleSlots.car.available', 0] },
                  { $ifNull: ['$vehicleSlots.auto.available', 0] }
                ]
              }
            }
          }
        }
      ])

    ]);

    const totals = slotTotals[0] || {
      total: 0,
      available: 0
    };

    res.json({
      locations,
      users,
      activeBookings: bookings,
      totalSlots: totals.total,
      availableSlots: totals.available,
      occupiedSlots: totals.total - totals.available
    });

  } catch (e) {
    next(e);
  }
}