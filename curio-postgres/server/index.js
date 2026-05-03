require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const session   = require('express-session');
const passport  = require('./config/passport');
const path      = require('path');
const sequelize = require('./config/db');

// ── Startup validation ─────────────────────────────────────────
const required = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
const missing  = required.filter(k => !process.env[k] || process.env[k].startsWith('your_'));
if (missing.length) {
  console.error('❌ Missing required env vars:', missing.join(', '));
  process.exit(1);
}

const CLIENT_URL = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;

const app = express();

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/news', require('./routes/news'));
app.use('/api/chat', require('./routes/chat'));
app.get('/api/health', (_, res) => res.json({ status: 'ok', googleOAuth: !!passport.googleConfigured }));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api'))
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── DB sync + Listen ───────────────────────────────────────────
sequelize.sync()   // creates tables if they don't exist
  .then(() => {
    console.log('✅ PostgreSQL connected & tables synced');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`);
      if (!passport.googleConfigured)
        console.warn('⚠️  Google OAuth disabled — add credentials to .env to enable it');
    });
  })
  .catch(err => { console.error('❌ PostgreSQL error:', err.message); process.exit(1); });
