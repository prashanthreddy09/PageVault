const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { run, get } = require('../db');
const registerSchema = z.object({ name: z.string().trim().min(2).max(60), email: z.string().trim().email().max(120), password: z.string().min(8).max(72) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(72) });
function tokenFor(user) { return jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }); }
async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const password = await bcrypt.hash(data.password, 12);
    const result = await run('INSERT INTO users(name,email,password) VALUES(?,?,?)', [data.name, data.email, password]);
    const user = { id: result.id, name: data.name, email: data.email };
    res.status(201).json({ token: tokenFor(user), user });
  } catch (err) { if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'This email is already registered.' }); next(err); }
}
async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const found = await get('SELECT * FROM users WHERE email = ?', [data.email]);
    if (!found || !(await bcrypt.compare(data.password, found.password))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const user = { id: found.id, name: found.name, email: found.email };
    res.json({ token: tokenFor(user), user });
  } catch (err) { next(err); }
}
module.exports = { register, login };
