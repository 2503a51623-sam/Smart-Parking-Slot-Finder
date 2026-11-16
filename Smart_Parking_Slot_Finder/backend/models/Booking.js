import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  parking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLocation',
    required: true
  },

  vehicleType: {
    type: String,
    enum: ['bike', 'car', 'auto'],
    required: true
  },

  slotNumber: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['booked', 'cancelled'],
    default: 'booked'
  },

  bookingDate: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

// Each vehicle category has its own slot numbering.
bookingSchema.index(
  { parking: 1, vehicleType: 1, slotNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'booked' }
  }
);

export default mongoose.model('Booking', bookingSchema);