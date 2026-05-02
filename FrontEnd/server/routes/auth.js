const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const passport = require('../config/passport');

const sign = (user) => jwt.sign(
  { id: user._id, name: user.name, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, category, country } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, phone, email, password, category, country });
    res.status(201).json({
      token: sign(user),
      user:  { id: user._id, name: user.name, email: user.email, category: user.category },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(401).json({ message: 'Invalid credentials' });

    if (!await user.comparePassword(password))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      token: sign(user),
      user:  { id: user._id, name: user.name, email: user.email, category: user.category, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/google
// Returns a clear error if Google OAuth is not configured instead of "Cannot GET"
router.get('/google', (req, res, next) => {
  if (!passport.googleConfigured) {
    return res.status(503).json({
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env',
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /api/auth/google/callback
router.get('/google/callback', (req, res, next) => {
  if (!passport.googleConfigured) {
    return res.redirect(`${process.env.CLIENT_URL || '/'}?error=oauth_not_configured`);
  }
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || '/'}?error=oauth_failed`,
  })(req, res, (err) => {
    if (err) return next(err);
    const token = sign(req.user);
    res.redirect(`${process.env.CLIENT_URL || '/'}?token=${token}`);
  });
});

// GET /api/auth/status — lets the frontend check config state
router.get('/status', (req, res) => {
  res.json({ googleOAuth: !!passport.googleConfigured });
});

module.exports = router;
