import mongoose from 'mongoose';

const vehicleSlotsSchema = new mongoose.Schema({
  total: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  available: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, { _id: false });

const parkingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  vehicleSlots: {
    bike: {
      type: vehicleSlotsSchema,
      default: () => ({})
    },
    car: {
      type: vehicleSlotsSchema,
      default: () => ({})
    },
    auto: {
      type: vehicleSlotsSchema,
      default: () => ({})
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, { timestamps: true });

parkingSchema.pre('validate', function () {
  for (const type of ['bike', 'car', 'auto']) {
    const slots = this.vehicleSlots[type];

    if (slots.available > slots.total) {
      this.invalidate(
        `vehicleSlots.${type}.available`,
        `${type} available slots cannot exceed total slots`
      );
    }
  }
});

export default mongoose.model('ParkingLocation', parkingSchema);