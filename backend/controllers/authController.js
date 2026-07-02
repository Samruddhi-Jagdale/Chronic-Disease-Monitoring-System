/**
 * Authentication Controller
 * Handles user registration, login, logout, and session check.
 */

const bcrypt     = require('bcryptjs');
const { UserModel } = require('../models/store');

// ── Register ──────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    if (UserModel.findByEmail(email)) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = UserModel.create({ name, email, passwordHash });

    // Create session
    req.session.userId   = user.id;
    req.session.userName = user.name;

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user:    { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
}

// ── Login ─────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.userId   = user.id;
    req.session.userName = user.name;

    res.json({
      success: true,
      message: 'Login successful.',
      user:    { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
}

// ── Logout ────────────────────────────────────────────────────
function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });
}

// ── Session check ─────────────────────────────────────────────
function checkSession(req, res) {
  if (req.session && req.session.userId) {
    const user = UserModel.findById(req.session.userId);
    return res.json({
      success:       true,
      authenticated: true,
      user:          { id: user?.id, name: user?.name, email: user?.email }
    });
  }
  res.json({ success: true, authenticated: false });
}

module.exports = { register, login, logout, checkSession };
