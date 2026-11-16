import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

function issueToken(id, role) {
  return jwt.sign({ id: String(id), role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8)
      return res.status(400).json({ message: 'Name, valid email and password (at least 8 characters) are required' });
    if (await User.exists({ email: email.toLowerCase().trim() }))
      return res.status(409).json({ message: 'Email is already registered' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: issueToken(user._id, 'user'), role: 'user', profile: { id: user._id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
}
export async function userLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
      return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: issueToken(user._id, 'user'), role: 'user', profile: { id: user._id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
}
export async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password || '', admin.passwordHash)))
      return res.status(401).json({ message: 'Invalid admin username or password' });
    res.json({ token: issueToken(admin._id, 'admin'), role: 'admin', profile: { id: admin._id, username: admin.username } });
  } catch (e) { next(e); }
}
