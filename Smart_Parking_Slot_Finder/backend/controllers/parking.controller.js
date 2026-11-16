import ParkingLocation from '../models/ParkingLocation.js';
import Booking from '../models/Booking.js';

const vehicleTypes = ['bike', 'car', 'auto'];

function validateVehicleSlots(vehicleSlots) {
  if (!vehicleSlots || typeof vehicleSlots !== 'object') {
    return false;
  }

  return vehicleTypes.every(type => {
    const slots = vehicleSlots[type];

    return slots &&
      Number.isInteger(Number(slots.total)) &&
      Number.isInteger(Number(slots.available)) &&
      Number(slots.total) >= 0 &&
      Number(slots.available) >= 0 &&
      Number(slots.available) <= Number(slots.total);
  });
}

async function getActiveBookings(locationId, type) {
  return Booking.countDocuments({
    parking: locationId,
    vehicleType: type,
    status: 'booked'
  });
}

export async function listParking(_req, res, next) {
  try {
    const locations = await ParkingLocation
      .find()
      .sort({ createdAt: -1 });

    res.json(locations);
  } catch (e) {
    next(e);
  }
}

export async function getParking(req, res, next) {
  try {
    const item = await ParkingLocation.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: 'Parking location not found'
      });
    }

    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function createParking(req, res, next) {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      vehicleSlots
    } = req.body;

    if (
      !name ||
      !address ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude)) ||
      !validateVehicleSlots(vehicleSlots)
    ) {
      return res.status(400).json({
        message: 'Enter valid location details and Bike, Car and Auto slot counts.'
      });
    }

    const item = await ParkingLocation.create({
      name,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      vehicleSlots: {
        bike: {
          total: Number(vehicleSlots.bike.total),
          available: Number(vehicleSlots.bike.available)
        },
        car: {
          total: Number(vehicleSlots.car.total),
          available: Number(vehicleSlots.car.available)
        },
        auto: {
          total: Number(vehicleSlots.auto.total),
          available: Number(vehicleSlots.auto.available)
        }
      },
      createdBy: req.auth.id
    });

    res.status(201).json(item);

  } catch (e) {
    next(e);
  }
}

export async function updateParking(req, res, next) {
  try {
    const item = await ParkingLocation.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: 'Parking location not found'
      });
    }

    const updates = req.body;

    for (const key of [
      'name',
      'address',
      'latitude',
      'longitude'
    ]) {
      if (updates[key] !== undefined) {
        item[key] = updates[key];
      }
    }

    if (updates.vehicleSlots !== undefined) {

      if (!validateVehicleSlots(updates.vehicleSlots)) {
        return res.status(400).json({
          message: 'Invalid Bike, Car or Auto slot counts.'
        });
      }

      for (const type of vehicleTypes) {
        const total = Number(updates.vehicleSlots[type].total);
        const available = Number(updates.vehicleSlots[type].available);

        const activeCount = await getActiveBookings(
          item._id,
          type
        );

        if (
          total < activeCount ||
          available > total - activeCount
        ) {
          return res.status(400).json({
            message: `${type} capacity must cover its active bookings and available slots.`
          });
        }

        item.vehicleSlots[type].total = total;
        item.vehicleSlots[type].available = available;
      }
    }

    await item.save();

    res.json(item);

  } catch (e) {
    next(e);
  }
}

export async function deleteParking(req, res, next) {
  try {
    const active = await Booking.countDocuments({
      parking: req.params.id,
      status: 'booked'
    });

    if (active) {
      return res.status(409).json({
        message: 'Cancel active bookings before deleting this location.'
      });
    }

    const item = await ParkingLocation.findByIdAndDelete(
      req.params.id
    );

    if (!item) {
      return res.status(404).json({
        message: 'Parking location not found'
      });
    }

    res.json({
      message: 'Parking location deleted'
    });

  } catch (e) {
    next(e);
  }
}