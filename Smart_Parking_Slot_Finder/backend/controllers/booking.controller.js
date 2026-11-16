import Booking from '../models/Booking.js';
import ParkingLocation from '../models/ParkingLocation.js';

const vehicleTypes = ['bike', 'car', 'auto'];

export async function myBookings(req, res, next) {
  try {
    const bookings = await Booking.find({
      user: req.auth.id
    })
      .populate('parking')
      .sort({ bookingDate: -1 });

    res.json(bookings);
  } catch (e) {
    next(e);
  }
}

export async function allBookings(_req, res, next) {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('parking', 'name address')
      .sort({ bookingDate: -1 });

    res.json(bookings);
  } catch (e) {
    next(e);
  }
}

export async function createBooking(req, res, next) {
  try {
    const { parkingId, vehicleType } = req.body;

    if (!parkingId || !vehicleTypes.includes(vehicleType)) {
      return res.status(400).json({
        message: 'Select a valid parking location and vehicle type.'
      });
    }

    const existing = await Booking.findOne({
      user: req.auth.id,
      parking: parkingId,
      status: 'booked'
    });

    if (existing) {
      return res.status(409).json({
        message: 'You already have an active booking at this location.'
      });
    }

    // Atomically reserve one slot for the selected vehicle.
    const parking = await ParkingLocation.findOneAndUpdate(
      {
        _id: parkingId,
        [`vehicleSlots.${vehicleType}.available`]: { $gt: 0 }
      },
      {
        $inc: {
          [`vehicleSlots.${vehicleType}.available`]: -1
        }
      },
      { new: true }
    );

    if (!parking) {
      return res.status(409).json({
        message: `No ${vehicleType} slots are currently available.`
      });
    }

    try {
      const occupied = await Booking.find({
        parking: parkingId,
        vehicleType,
        status: 'booked'
      }).select('slotNumber');

      const used = new Set(
        occupied.map(b => b.slotNumber)
      );

      let slotNumber = 1;

      while (
        used.has(slotNumber) &&
        slotNumber <= parking.vehicleSlots[vehicleType].total
      ) {
        slotNumber++;
      }

      if (slotNumber > parking.vehicleSlots[vehicleType].total) {
        throw new Error('No numbered vehicle slot is available.');
      }

      const booking = await Booking.create({
        user: req.auth.id,
        parking: parkingId,
        vehicleType,
        slotNumber
      });

      return res.status(201).json({
        booking,
        parking
      });

    } catch (error) {
      await ParkingLocation.updateOne(
        { _id: parkingId },
        {
          $inc: {
            [`vehicleSlots.${vehicleType}.available`]: 1
          }
        }
      );

      if (error.code === 11000) {
        return res.status(409).json({
          message: 'That slot was just booked. Please try again.'
        });
      }

      throw error;
    }

  } catch (e) {
    next(e);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.auth.id,
        status: 'booked'
      },
      {
        $set: { status: 'cancelled' }
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        message: 'Active booking not found.'
      });
    }

    await ParkingLocation.updateOne(
      { _id: booking.parking },
      {
        $inc: {
          [`vehicleSlots.${booking.vehicleType}.available`]: 1
        }
      }
    );

    res.json({
      message: 'Booking cancelled successfully.',
      booking
    });

  } catch (e) {
    next(e);
  }
}