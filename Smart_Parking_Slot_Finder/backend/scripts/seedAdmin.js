import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env'); process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_parking');
const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
await Admin.findOneAndUpdate(
  { username: process.env.ADMIN_USERNAME },
  { $set: { passwordHash } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
console.log(`Admin "${process.env.ADMIN_USERNAME}" is ready.`);
await mongoose.disconnect();
